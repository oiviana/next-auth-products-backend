import { addCartItem, getCart, removeCartItem } from "@controllers/cart";
import { FastifyInstance } from "fastify";
import { FastifyRequest } from "fastify/types/request";

export async function cartRoutes(server: FastifyInstance) {

  server.get("/",
    {
      preValidation: [server.authenticate]
    },
    async (req, reply) => {
      try {
        const cart = await getCart(req, reply);
        return cart;
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar carrinho");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );

  server.post("/add-item",
    {
      preValidation: [server.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string' },
            quantity: { type: 'number', minimum: 1 }
          }
        }
      }
    },
    async (req, reply) => {
      try {
        const result = await addCartItem(
          req as FastifyRequest<{ Body: { productId: string; quantity: number } }>,
          reply
        );
        return result;
      } catch (error) {
        server.log.error({ error }, "Erro ao adicionar item ao carrinho");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );

  server.delete("/items/:itemId",
  { 
    preValidation: [server.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          itemId: { type: 'string' }
        },
        required: ['itemId']
      }
    }
  },
  async (req, reply) => {
    try {
      const result = await removeCartItem(
        req as FastifyRequest<{ Params: { itemId: string } }>, 
        reply
      );
      return result;
    } catch (error) {
      server.log.error({ error }, "Erro ao remover item do carrinho");
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  }
);

}