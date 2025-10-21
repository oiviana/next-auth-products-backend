import Fastify from 'fastify';
import { app } from './app';
import authentication from '@plugins/authentication';
import cors from '@fastify/cors';

const serverPort = parseInt(process.env.PORT || process.env.SERVER_PORT || '3333', 10);

export const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid',
      },
    },
  },
});

server.register(cors, {
  origin: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Hook para debug das requisições CORS
server.addHook('onRequest', (request, reply, done) => {
  console.log('📨 Request received:', {
    method: request.method,
    url: request.url,
    origin: request.headers.origin
  });
  done();
});

// Registrar autenticação
server.register(authentication);

const start = async () => {
  try {
    await app(server);
    await server.listen({ port: serverPort, host: "0.0.0.0" });
    console.info(`🚀 Server running on port ${serverPort}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();