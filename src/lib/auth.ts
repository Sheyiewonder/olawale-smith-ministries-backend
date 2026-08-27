import type { FastifyReply, FastifyRequest } from "fastify";

import type { AdminRole } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: AuthUser;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      error: "Unauthorized",
    });
  }
}

export async function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: AdminRole[],
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({
      error: "Unauthorized",
    });
  }

  if (!roles.includes(request.user.role)) {
    return reply.code(403).send({
      error: "Forbidden",
    });
  }
}