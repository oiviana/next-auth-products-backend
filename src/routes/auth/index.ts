import { FastifyInstance } from "fastify";
import { loginController } from "@controllers/auth";

export async function authRoutes(server: FastifyInstance) {
  server.post("/login", loginController);
}