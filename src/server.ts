import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { adminResourceRoutes } from "./modules/resources/admin.resources.routes.js";
import prismaPlugin from "./lib/prisma-plugin.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { resourceRoutes } from "./modules/resources/resources.routes.js";
import { adminCategoryRoutes } from "./modules/categories/admin.categories.routes.js";

const app = Fastify({
  logger: true,
});

async function startServer() {
  await app.register(cors, {
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

  await app.register(jwt, {
    secret: process.env.JWT_SECRET,
  });

  await app.register(prismaPlugin);

  await app.register(resourceRoutes, {
    prefix: "/api",
  });

  await app.register(adminRoutes, {
    prefix: "/api",
  });

  await app.register(adminResourceRoutes, {
    prefix: "/api",
  });

  await app.register(adminCategoryRoutes, {
    prefix: "/api",
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "olawale-smith-ministries-api",
      timestamp: new Date().toISOString(),
    };
  });

  const port = Number(
    process.env.PORT ?? 4000,
  );

  try {
    await app.listen({
      port,
      host: "0.0.0.0",
    });

    console.log(
      `API running on http://localhost:${port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

startServer();