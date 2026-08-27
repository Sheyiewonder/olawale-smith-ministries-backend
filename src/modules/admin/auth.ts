import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

import { prisma } from "../../lib/prisma.js";

interface AdminTokenPayload {
  id: string;
  email: string;
  role: "ADMIN" | "SUPER_ADMIN";
}

declare module "fastify" {
  interface FastifyRequest {
    admin: {
      id: string;
      name: string;
      email: string;
      role: "ADMIN" | "SUPER_ADMIN";
      isActive: boolean;
    };
  }
}

export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorization =
    request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Authentication required",
    });
  }

  const token = authorization.slice(7);

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_SECRET is not configured",
      );
    }

    const payload = jwt.verify(
      token,
      secret,
    ) as AdminTokenPayload;

    if (
      !payload.id ||
      !payload.email ||
      !payload.role
    ) {
      return reply.status(401).send({
        error: "Invalid authentication token",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: {
        id: payload.id,
      },
    });

    if (!admin || !admin.isActive) {
      return reply.status(401).send({
        error: "Admin account is inactive or unavailable",
      });
    }

    request.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
    };
  } catch {
    return reply.status(401).send({
      error: "Invalid or expired authentication token",
    });
  }
}

export function requireRole(
  ...allowedRoles: ("ADMIN" | "SUPER_ADMIN")[]
) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => {
    if (!request.admin) {
      return reply.status(401).send({
        error: "Authentication required",
      });
    }

    if (
      !allowedRoles.includes(request.admin.role)
    ) {
      return reply.status(403).send({
        error: "You do not have permission to perform this action",
      });
    }
  };
}