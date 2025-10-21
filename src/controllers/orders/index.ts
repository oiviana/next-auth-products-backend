// controllers/orders/createOrder.ts
import prisma from "@lib/prisma";
import { FastifyRequest, FastifyReply } from "fastify";
import { getUserIdByToken } from "@utils/getUserIdByToken";

export async function createOrder(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    // Buscar o carrinho do usuário com todos os itens
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return reply.status(400).send({ message: "Carrinho vazio" });
    }

    // Validar estoque antes de criar o pedido
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return reply.status(400).send({
          message: `Produto "${item.product.name}" não tem estoque suficiente. Disponível: ${item.product.stock}, Solicitado: ${item.quantity}`,
        });
      }
    }

    // total do pedido
    const total = cart.items.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    // Usar transaction para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
        
      // 1. Criar a Order
      const order = await tx.order.create({
        data: {
          userId,
          total,
          status: "COMPLETED", // aqui pode ter outros status para integração com meios de pagameento por exemplo
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  store: true,
                },
              },
            },
          },
        },
      });

      // 2. Atualizar estoque e soldCount dos produtos
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
            soldCount: {
              increment: item.quantity,
            },
          },
        });
      }

      // 3. Limpar o carrinho (deletar todos os items)
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // 4. Atualizar updatedAt do carrinho
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          updatedAt: new Date(),
        },
      });

      return order;
    });

    return reply.status(201).send({
      message: "Pedido criado com sucesso",
      order: result,
    });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}

export async function getUserOrders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    const orders = await prisma.order.findMany({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                store: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send(orders);
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}