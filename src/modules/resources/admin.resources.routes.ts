import type { FastifyInstance } from "fastify";

import {
  createResource,
  deleteResource,
  getAdminResource,
  listAdminResources,
  updateResource,
} from "./admin.resources.service.js";

import { requireAuth } from "../../lib/auth.js";

export async function adminResourceRoutes(
  app: FastifyInstance,
) {
  /* ------------------------------------------------------------------------ */
  /* List Resources                                                           */
  /* GET /api/admin/resources                                                  */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/admin/resources",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const resources =
          await listAdminResources();

        return reply.code(200).send({
          data: resources,
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          error: "Failed to load resources",
        });
      }
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Get Single Resource                                                      */
  /* GET /api/admin/resources/:id                                              */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/admin/resources/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      if (!id) {
        return reply.code(400).send({
          error: "Resource ID is required",
        });
      }

      try {
        const resource =
          await getAdminResource(id);

        if (!resource) {
          return reply.code(404).send({
            error: "Resource not found",
          });
        }

        return reply.code(200).send({
          data: resource,
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          error: "Failed to load resource",
        });
      }
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Create Resource                                                          */
  /* POST /api/admin/resources                                                 */
  /* ------------------------------------------------------------------------ */

  app.post(
    "/admin/resources",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const resource =
          await createResource(
            request.body as any,
          );

        return reply.code(201).send({
          data: resource,
        });
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Failed to create resource";

        /*
         * Prisma unique constraint.
         *
         * This is especially useful for duplicate slugs.
         */
        if (
          message.includes(
            "Unique constraint failed",
          )
        ) {
          return reply.code(409).send({
            error:
              "A resource with this slug already exists",
          });
        }

        return reply.code(400).send({
          error: message,
        });
      }
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Update Resource                                                          */
  /* PATCH /api/admin/resources/:id                                            */
  /* ------------------------------------------------------------------------ */

  app.patch(
    "/admin/resources/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      if (!id) {
        return reply.code(400).send({
          error: "Resource ID is required",
        });
      }

      try {
        const resource =
          await updateResource(
            id,
            request.body as any,
          );

        return reply.code(200).send({
          data: resource,
        });
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Failed to update resource";

        if (
          message === "Resource not found"
        ) {
          return reply.code(404).send({
            error: message,
          });
        }

        if (
          message.includes(
            "Unique constraint failed",
          )
        ) {
          return reply.code(409).send({
            error:
              "A resource with this slug already exists",
          });
        }

        return reply.code(400).send({
          error: message,
        });
      }
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Delete Resource                                                          */
  /* DELETE /api/admin/resources/:id                                           */
  /* ------------------------------------------------------------------------ */

  app.delete(
    "/admin/resources/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      if (!id) {
        return reply.code(400).send({
          error: "Resource ID is required",
        });
      }

      try {
        const result =
          await deleteResource(id);

        return reply.code(200).send({
          data: result,
        });
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete resource";

        if (
          message === "Resource not found"
        ) {
          return reply.code(404).send({
            error: message,
          });
        }

        return reply.code(400).send({
          error: message,
        });
      }
    },
  );
}