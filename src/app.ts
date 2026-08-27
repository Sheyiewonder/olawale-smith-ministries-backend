import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";

import prismaPlugin from "./lib/prisma-plugin.js";

import { adminRoutes } from "./modules/admin/admin.routes.js";
import { resourceRoutes } from "./modules/resources/resources.routes.js";
import { adminResourceRoutes } from "./modules/resources/admin.resources.routes.js";
import { adminCategoryRoutes } from "./modules/categories/admin.categories.routes.js";
import { adminMediaRoutes } from "./modules/media/admin.media.routes.js";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.register(multipart, {
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
  });


  app.register(cors, {
    origin: true,
    methods: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  });

  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not configured",
    );
  }

  app.register(jwt, {
    secret: process.env.JWT_SECRET,
  });

  app.register(prismaPlugin);

  app.register(resourceRoutes, {
    prefix: "/api",
  });

  app.register(adminRoutes, {
    prefix: "/api",
  });

  app.register(adminResourceRoutes, {
    prefix: "/api",
  });

  app.register(adminCategoryRoutes, {
    prefix: "/api",
  });

  app.register(adminMediaRoutes, {
    prefix: "/api",
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "olawale-smith-ministries-api",
      timestamp: new Date().toISOString(),
    };
  });

  return app;
}