
import prisma from "@lib/prisma";
import { FastifyRequest, FastifyReply } from "fastify";
import { getUserIdByToken } from "@utils/getUserIdByToken";

export async function toggleFavoriteProduct(
  request: FastifyRequest<{
    Body: {
      productId: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);
    const { productId } = request.body;

    // Verificar se o produto existe
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

    // Verificar se já é favorito
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    let action: 'added' | 'removed';
    let favorite;

    if (existingFavorite) {
      // Remover dos favoritos
      await prisma.favorite.delete({
        where: {
          id: existingFavorite.id,
        },
      });
      action = 'removed';
    } else {
      // Adicionar aos favoritos
      favorite = await prisma.favorite.create({
        data: {
          userId,
          productId,
        },
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
      });
      action = 'added';
    }

    return reply.send({
      action,
      productId,
      favorite: action === 'added' ? favorite : null,
    });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}

export async function getFavorites(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    const favorites = await prisma.favorite.findMany({
      where: {
        userId,
      },
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
        createdAt: 'desc',
      },
    });

    return reply.send(favorites);
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}