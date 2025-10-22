import { FastifyInstance } from "fastify";
import { prismaPlugin } from "@plugins/prisma";
import { productRoutes } from "@routes/products";
import { userRoutes } from "@routes/users";
import { Prisma } from "@prisma/client";
import { authRoutes } from "@routes/auth";
import { uploadRoutes } from "@routes/upload";
import { cartRoutes } from "@routes/cart";
import { favoriteRoutes } from "@routes/favorites";
import { orderRoutes } from "@routes/orders";

export async function app(server: FastifyInstance) {

  await server.register(prismaPlugin);

  // Error handler global
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return reply.status(400).send({ message: error.message });
    }

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