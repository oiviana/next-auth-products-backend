import Fastify from 'fastify';
import { app } from './app';
import authentication from '@plugins/authentication';

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

server.register(authentication);

const start = async () => {
  try {
    await app(server);
    await server.listen({ port: serverPort, host: "0.0.0.0" });
    console.info(`Server running on port ${serverPort}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();