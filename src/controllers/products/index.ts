import prisma from "@lib/prisma";
import { FastifyRequest, FastifyReply } from "fastify";
import { getUserIdByToken } from "@utils/getUserIdByToken";

// Todos os produtos de um vendedor
export async function getAllProductsBySeller(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);
    const products = await prisma.product.findMany({
      where: {
        store: {
          ownerId: userId,
        },
      },
    });

    return reply.send(products);
  } catch (error) {
    request.server.log.error(error);
    return reply.status(401).send({ message: "Não autorizado" });
  }
}

// Conta todos os produtos de um vendedor
export async function countAllProductsBySeller(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    const totalProducts = await prisma.product.count({
      where: {
        store: {
          ownerId: userId,
        },
      },
    });

    return reply.send({ total: totalProducts });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(401).send({ message: "Não autorizado" });
  }
}

// Conta todos os produtos vendidos
export async function totalProductsSoldBySeller(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    // Soma de as colunas de quantidade
    const result = await prisma.orderItem.aggregate({
      _sum: {
        quantity: true,
      },
      where: {
        product: {
          store: {
            ownerId: userId,
          },
        },
      },
    });

    const totalSold = result._sum.quantity ?? 0;

    return reply.send({ totalSold });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(401).send({ message: "Não autorizado" });
  }
}

// Total de faturamento de um vendedor
export async function getTotalRevenueBySeller(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    // Buscar todos os pedidos que contêm produtos do vendedor
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              store: {
                ownerId: userId,
              },
            },
          },
        },
      },
      select: {
        total: true,
      },
    });

    // Somar o campo total de cada pedido
    const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);

    return reply.send({ totalRevenue });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(401).send({ message: "Não autorizado" });
  }
}

//Produto mais vendido de um vendedor
export async function getMoreSoldProduct(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);

    const mostSoldProduct = await prisma.product.findFirst({
      where: {
        store: {
          ownerId: userId,
        },
      },
      orderBy: {
        soldCount: 'desc',
      },
    });

    if (!mostSoldProduct) {
      return reply.status(404).send({ message: "Nenhum produto encontrado" });
    }

    return reply.send(mostSoldProduct);
  } catch (error) {
    request.server.log.error(error);
    return reply.status(401).send({ message: "Não autorizado" });
  }
}

// Cria um produto
export async function createProduct(
  request: FastifyRequest<{
    Body: CreateProductBody;
  }>,
  reply: FastifyReply
) {
  try {
    console.log("🟡 [createProduct] Iniciando criação de produto...");

    // Obter o ID do usuário via token
    const userId = await getUserIdByToken(request);
    console.log("👤 userId obtido:", userId);

    const { name, description, price, stock, isVisible = true } = request.body;
    console.log("📦 Dados recebidos do body:", {
      name,
      description,
      price,
      stock,
      isVisible,
    });

    // Buscar a loja associada ao usuário autenticado
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
    });
    console.log("🏬 Loja encontrada:", store);

    if (!store) {
      console.warn("⚠️ Nenhuma loja encontrada para o usuário:", userId);
      return reply.status(404).send({ message: "Loja não encontrada" });
    }

    // Criar produto
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        isVisible,
        store: {
          connect: {
            id: store.id,
          },
        },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("✅ Produto criado com sucesso:", product);

    return reply.status(201).send(product);
  } catch (error) {
    console.error("❌ Erro ao criar produto:", error);
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}



// Produtos disponíveis para venda com paginação
export async function getProductsAvailableForSale(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
    }
  }>,
  reply: FastifyReply
) {
  try {
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '20'); 
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          isVisible: true,
          store: {
            isActive: true,
          },
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.product.count({
        where: {
          isVisible: true,
          store: {
            isActive: true,
          },
        },
      }),
    ]);

    return reply.send({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}

// Obter detalhes de um produto
export async function getProductDetails(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { id } = request.params;

    const product = await prisma.product.findUnique({
      where: {
        id,
        isVisible: true,
        store: {
          isActive: true,
        },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return reply.status(404).send({ message: "Produto não encontrado" });
    }

    return reply.send(product);
  } catch (error) {
    request.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno do servidor" });
  }
}