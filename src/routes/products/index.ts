import { FastifyInstance } from "fastify";
import { getAllProductsBySeller, createProduct, getMoreSoldProduct, countAllProductsBySeller, totalProductsSoldBySeller, getTotalRevenueBySeller, getProductsAvailableForSale, getProductDetails } from "@controllers/products";
import { Prisma } from "@prisma-generated/prisma";
import { FastifyRequest } from "fastify/types/request";

export async function productRoutes(server: FastifyInstance) {

  server.get("/all-products-by-seller",
    { preValidation: [server.authenticate] },
    async (req, reply) => {
      try {
        const products = await getAllProductsBySeller(req, reply);
        return reply.send(products);
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar produtos");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    });


  server.get("/more-sold",
    { preValidation: [server.authenticate] },
    async (req, reply) => {
      try {
        const moreSoldProduct = await getMoreSoldProduct(req, reply);
        return reply.send(moreSoldProduct);
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar produto");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    });

  server.get("/count-products-by-seller",
    { preValidation: [server.authenticate] },
    async (req, reply) => {
      try {
        const allProductsBySeller = await countAllProductsBySeller(req, reply);
        return reply.send(allProductsBySeller);
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar produtos");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    });

  server.get("/all-products-sold-by-seller",
    { preValidation: [server.authenticate] },
    async (req, reply) => {
      try {
        const allProductsSold = await totalProductsSoldBySeller(req, reply);
        return reply.send(allProductsSold);
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar produtos");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    });
    

server.get("/all-available-for-sale",
  { 
    preValidation: [server.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' }
        }
      }
    }
  },
  async (req, reply) => {
    try {
      const availableProducts = await getProductsAvailableForSale(req as FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply);
      return reply.send(availableProducts);
    } catch (error) {
      server.log.error({ error }, "Erro ao buscar produtos disponíveis");
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  }
);

server.get("/:id",
  { 
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  },
  async (req, reply) => {
    try {
      const productDetails = await getProductDetails(
        req as FastifyRequest<{ Params: { id: string } }>, 
        reply
      );
      return reply.send(productDetails);
    } catch (error) {
      server.log.error({ error }, "Erro ao buscar detalhes do produto");
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  }
);


  server.get("/total-revenue-by-seller",
    { preValidation: [server.authenticate] },
    async (req, reply) => {
      try {
        const totalRevenue = await getTotalRevenueBySeller(req, reply);
        return reply.send(totalRevenue);
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar faturamento");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    });


server.post<{ Body: CreateProductBody }>(
  "/",
  { preValidation: [server.authenticate] },
  async (req, reply) => {
    try {
      const product = await createProduct(req, reply);
      return reply.status(201).send(product);
    } catch (error) {
      server.log.error({ error }, "Erro ao criar produto");
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  }
);
}
