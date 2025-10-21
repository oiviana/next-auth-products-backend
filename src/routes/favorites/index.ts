// routes/favorites.ts
import { FastifyInstance } from "fastify";
import { getFavorites, toggleFavoriteProduct } from "@controllers/favorites";
import { FastifyRequest } from "fastify/types/request";

export async function favoriteRoutes(server: FastifyInstance) {

    server.get("/",
    { 
      preValidation: [server.authenticate]
    },
    async (req, reply) => {
      try {
        const favorites = await getFavorites(req, reply);
        return favorites;
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar favoritos");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );
  
  server.post("/toggle",
    { 
      preValidation: [server.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['productId'],
          properties: {
            productId: { type: 'string' }
          }
        }
      }
    },
    async (req, reply) => {
      try {
        const result = await toggleFavoriteProduct(
          req as FastifyRequest<{ Body: { productId: string } }>, 
          reply
        );
        return result;
      } catch (error) {
        server.log.error({ error }, "Erro ao alternar favorito");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );
}