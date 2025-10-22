import { FastifyInstance } from "fastify";
import { createUser } from "@controllers/users";
import { Prisma } from "@prisma/client";

export async function userRoutes(server: FastifyInstance) {
    
  server.post<{ Body: Prisma.UserCreateInput }>("/", async (req, reply) => {
    try {
      const newUser = await createUser(req.body);
      return reply.status(201).send(newUser);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (
          error.message.includes("Unique constraint") ||
          error.message.includes("User already exists")
        ) {
          return reply.status(409).send({
            error: "Já existe um usuário registrado com este e-mail.",
          });
        }

        server.log.error(error);
        return reply.status(400).send({ error: error.message });
      }

      server.log.error({ error });
      return reply.status(500).send({ error: "Erro desconhecido" });
    }
  });
}
