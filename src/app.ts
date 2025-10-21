import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { prismaPlugin } from "@plugins/prisma";
import { productRoutes } from "@routes/products";
import { userRoutes } from "@routes/users";
import { Prisma } from "@prisma-generated/prisma";
import { authRoutes } from "@routes/auth";
import { uploadRoutes } from "@routes/upload";
import { cartRoutes } from "@routes/cart";
import { favoriteRoutes } from "@routes/favorites";
import { orderRoutes } from "@routes/orders";

export async function app(server: FastifyInstance) {
  // Middlewares
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  await server.register(prismaPlugin);

  // Error handler global
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error); // log completo no console / arquivo

    // Tratamento de erro do Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return reply.status(400).send({ message: error.message });
    }

    // Outros erros
    return reply.status(500).send({ message: 'Erro interno do servidor' });
  });

  // Rotas
  server.register(productRoutes, { prefix: "/products" });
  server.register(userRoutes, { prefix: "/users" });
  server.register(authRoutes, { prefix: "/auth" });
  server.register(uploadRoutes, { prefix: "/upload" });
  server.register(cartRoutes, { prefix: "/cart" });
  server.register(favoriteRoutes, { prefix: "/favorites" });
  server.register(orderRoutes, { prefix: "/orders" });
}
