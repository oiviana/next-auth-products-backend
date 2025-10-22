import Fastify from 'fastify';
import cors from '@fastify/cors';
import authentication from '@plugins/authentication';
import { app } from './app';

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

server.addHook('onRequest', (request, reply, done) => {
  console.log('📨 Request received:', {
    method: request.method,
    url: request.url,
    origin: request.headers.origin,
  });
  done();
});

const allowedOrigins = [
  'https://next-auth-products-frontend-production.up.railway.app',
  'https://next-auth-products-frontend-cog7.vercel.app',
  'http://localhost:3000',
];

const start = async () => {
  try {
    await server.register(cors, {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); 
        if (allowedOrigins.includes(origin)) {
          cb(null, true);
        } else {
          cb(new Error("Not allowed by CORS"), false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    await server.register(authentication);
    await app(server);

    await server.listen({ port: serverPort, host: '0.0.0.0' });
    console.info(`🚀 Server running on port ${serverPort}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
