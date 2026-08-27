import type { FastifyInstance } from "fastify";

import {
  findAdminByEmail,
  verifyAdminPassword,
} from "./admin.service.js";

import { requireAuth } from "../../lib/auth.js";

export async function adminRoutes(
  app: FastifyInstance,
) {
  /* -------------------------------------------------------------------------- */
  /* Login                                                                      */
  /* -------------------------------------------------------------------------- */

  app.post(
    "/admin/auth/login",
    async (request, reply) => {
      const body = request.body as {
        email?: string;
        password?: string;
      };

      const email = body.email
        ?.trim()
        .toLowerCase();

      const password = body.password;

      if (!email || !password) {
        return reply.code(400).send({
          error: "Email and password are required",
        });
      }

      const admin = await findAdminByEmail(email);

      if (!admin) {
        return reply.code(401).send({
          error: "Invalid email or password",
        });
      }

      if (!admin.isActive) {
        return reply.code(403).send({
          error:
            "This admin account has been deactivated",
        });
      }

      const passwordValid =
        await verifyAdminPassword(
          password,
          admin.password,
        );

      if (!passwordValid) {
        return reply.code(401).send({
          error: "Invalid email or password",
        });
      }

      const token = await reply.jwtSign(
        {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        {
          expiresIn: "7d",
        },
      );

      return reply.send({
        data: {
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive,
          },
          token,
        },
      });
    },
  );

  /* -------------------------------------------------------------------------- */
  /* Current Admin                                                              */
  /* -------------------------------------------------------------------------- */

  app.get(
    "/admin/auth/me",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const admin =
        await app.prisma.admin.findUnique({
          where: {
            id: request.user.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        });

      if (!admin || !admin.isActive) {
        return reply.code(401).send({
          error:
            "Admin account is no longer active",
        });
      }

      return reply.send({
        data: admin,
      });
    },
  );

  /* -------------------------------------------------------------------------- */
  /* Logout                                                                     */
  /* -------------------------------------------------------------------------- */

  app.post(
    "/admin/auth/logout",
    {
      preHandler: requireAuth,
    },
    async (_request, reply) => {
      /*
       * JWT authentication is stateless, so there is no
       * server-side session to destroy here.
       *
       * The frontend should remove the stored token.
       */
      return reply.send({
        data: {
          success: true,
        },
      });
    },
  );
}