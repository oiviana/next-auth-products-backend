import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import jwt from "@fastify/jwt";

const authenticationPlugin: FastifyPluginAsync = async (server) => {

  server.register(jwt, {
    secret: process.env.JWT_SECRET ?? "",
  });


  server.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ message: "Token inválido ou ausente" });
      }
    }
  );
};

export default fp(authenticationPlugin);

export type AuthenticationPlugin = typeof authenticationPlugin;
