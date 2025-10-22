import prisma from "@lib/prisma";
import { Prisma, User } from "@prisma/client"
import bcrypt from "bcryptjs";


export async function isUserAlreadyExist(email: string): Promise<boolean> {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })
  return !!existingUser
}

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  const { passwordHash, ...rest } = data

  const exists = await isUserAlreadyExist(rest.email)
  if (exists) {
    throw new Error("User already exists")
  }

  const hashedPassword = await bcrypt.hash(passwordHash, 10)

  const user = await prisma.user.create({
    data: {
      ...rest,
      passwordHash: hashedPassword,
      role: rest.role || "CLIENT",
    },
  })

  if (user.role === "SELLER") {
    await prisma.store.create({
      data: {
        ownerId: user.id,
        name: `${user.name || "Nova Loja"}`,
      },
    })
  }

  return user
}

export async function getAllUsers(): Promise<User[]> {
  return prisma.user.findMany({
    include: { store: true },
  });
}
