// src/utils/getUserIdByToken.ts
import { FastifyRequest } from "fastify";

export async function getUserIdByToken(request: FastifyRequest): Promise<string> {
  try {
    const user = await request.jwtVerify<{ id: string }>();
    return user.id;
  } catch (error) {
    throw new Error("Token inválido ou ausente");
  }
}
