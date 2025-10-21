// controllers/cart/addCartItem.ts
import prisma from "@lib/prisma";
import { FastifyRequest, FastifyReply } from "fastify";
import { getUserIdByToken } from "@utils/getUserIdByToken";

interface AddCartItemBody {
  productId: string;
  quantity: number;
}

export async function addCartItem(
  request: FastifyRequest<{
    Body: AddCartItemBody;
  }>,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);
    const { productId, quantity } = request.body;

    // Validar quantidade
    if (quantity <= 0) {
      return reply.status(400).send({ message: "Quantidade deve ser maior que zero" });
    }

    // Verificar se o produto existe e está disponível
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        isVisible: true,
        store: {
          isActive: true,
        },
      },
    });

    if (!product) {
      return reply.status(404).send({ message: "Produto não encontrado" });
    }

    if (product.stock < quantity) {
      return reply.status(400).send({
        message: `Quantidade indisponível. Estoque: ${product.stock}`
      });
    }

    // Encontrar ou criar o carrinho do usuário
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          items: {
            create: [],
          },
        },
        include: { items: true },
      });
    }

    // Verificar se o item já existe no carrinho
    const existingItem = cart.items.find(item => item.productId === productId);

    if (existingItem) {
      // Atualizar quantidade do item existente
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          addedAt: new Date()
        },
        include: { product: true },
      });

      return reply.status(200).send({
        message: "Item atualizado no carrinho",
        cartItem: updatedItem,
      });
    } else {
      // Adicionar novo item ao carrinho
      const newItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
        include: { product: true },
      });

      return reply.status(201).send({
        message: "Item adicionado ao carrinho",
        cartItem: newItem,
      });
    }
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}

export async function removeCartItem(
  request: FastifyRequest<{
    Params: {
      itemId: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);
    const { itemId } = request.params;

    // Verificar se o item existe e pertence ao usuário
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId: userId,
        },
      },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      return reply.status(404).send({ message: "Item não encontrado no carrinho" });
    }

    // Remover o item do carrinho
    await prisma.cartItem.delete({
      where: {
        id: itemId,
      },
    });

    // Atualizar o updatedAt do carrinho
    await prisma.cart.update({
      where: {
        id: cartItem.cartId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return reply.status(200).send({ 
      message: "Item removido do carrinho",
      removedItemId: itemId 
    });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}

export async function getCart(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    // Buscar o carrinho do usuário com todos os itens e informações do produto
    const cart = await prisma.cart.findUnique({
      where: { userId },
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
          orderBy: {
            addedAt: 'desc',
          },
        },
      },
    });

    // Se não existir carrinho, retornar vazio
    if (!cart) {
      return reply.send({
        id: null,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      });
    }

    // Calcular totais
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    return reply.send({
      id: cart.id,
      items: cart.items,
      totalItems,
      totalPrice,
      updatedAt: cart.updatedAt,
    });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}