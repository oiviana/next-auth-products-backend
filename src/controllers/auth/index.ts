import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";

interface LoginRequest {
  email: string;
  password: string;
}

export async function loginController(
  req: FastifyRequest<{ Body: LoginRequest }>,
  reply: FastifyReply
) {
  try {
    const { email, password } = req.body;

    const user = await req.server.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ message: "Credenciais inválidas" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ message: "Credenciais inválidas" });
    }

    // Gera o token JWT
    const token = await reply.jwtSign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: "1h" }
    );

    return reply.send({
      message: "Login bem-sucedido",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    req.server.log.error(error);
    return reply.status(500).send({ message: "Erro interno no servidor" });
  }
}
