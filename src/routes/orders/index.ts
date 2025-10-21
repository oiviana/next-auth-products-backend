import { FastifyInstance } from "fastify";
import { createOrder, getUserOrders } from "@controllers/orders";

export async function orderRoutes(server: FastifyInstance) {
  server.post("/create",
    { 
      preValidation: [server.authenticate]
    },
    async (req, reply) => {
      try {
        const result = await createOrder(req, reply);
        return result;
      } catch (error) {
        server.log.error({ error }, "Erro ao criar pedido");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );

    server.get("/my-orders",
    { 
      preValidation: [server.authenticate]
    },
    async (req, reply) => {
      try {
        const orders = await getUserOrders(req, reply);
        return orders;
      } catch (error) {
        server.log.error({ error }, "Erro ao buscar pedidos");
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );
}