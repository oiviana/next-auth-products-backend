import { FastifyInstance } from "fastify";
import { uploadCSV } from "@controllers/upload";
import multipart from "@fastify/multipart";

export async function uploadRoutes(server: FastifyInstance) {
  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  server.post("/csv", {
    preValidation: [server.authenticate],
  }, uploadCSV);


}