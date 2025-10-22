import fp from "fastify-plugin";
import { PrismaClient } from '@prisma/client'

export const prismaPlugin = fp(async (server) => {
  try {
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });

    await prisma.$connect();
    
    server.log.info('Prisma Client conectado com sucesso');

    server.decorate("prisma", prisma);

    server.addHook("onClose", async (srv) => {
      await srv.prisma.$disconnect();
      srv.log.info('Prisma Client desconectado');
    });

  } catch (error) {
    server.log.error({ err: error }, 'Erro ao conectar Prisma Client');
    throw error;
  }
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}