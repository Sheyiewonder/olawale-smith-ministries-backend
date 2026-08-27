import type { FastifyInstance } from "fastify";

import {
  createCategory,
  deleteCategory,
  getAdminCategory,
  listAdminCategories,
  updateCategory,
} from "./admin.categories.service.js";

import { requireAuth } from "../../lib/auth.js";

export async function adminCategoryRoutes(
  app: FastifyInstance,
) {
  /* ------------------------------------------------------------------------ */
  /* List Categories                                                          */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/admin/categories",
    {
      preHandler: requireAuth,
    },
    async () => {
      const categories =
        await listAdminCategories();

      return {
        data: categories,
      };
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Get Category                                                             */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/admin/categories/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } =
        request.params as {
          id: string;
        };

      const category =
        await getAdminCategory(id);

      if (!category) {
        return reply.code(404).send({
          error: "Category not found",
        });
      }

      return {
        data: category,
      };
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Create Category                                                          */
  /* ------------------------------------------------------------------------ */

  app.post(
    "/admin/categories",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          name?: string;
          slug?: string;
          description?: string | null;
        };

        if (!body.name || !body.slug) {
          return reply.code(400).send({
            error:
              "Category name and slug are required",
          });
        }

        const category =
          await createCategory({
            name: body.name,
            slug: body.slug,
            description: body.description,
          });

        return reply.code(201).send({
          data: category,
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(400).send({
          error:
            error instanceof Error
              ? error.message
              : "Failed to create category",
        });
      }
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Update Category                                                          */
  /* ------------------------------------------------------------------------ */

  app.patch(
    "/admin/categories/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } =
        request.params as {
          id: string;
        };

      try {
        const category =
          await updateCategory(
            id,
            request.body as {
              name?: string;
              slug?: string;
              description?: string | null;
            },
          );

        return {
          data: category,
        };
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Failed to update category";

        if (message === "Category not found") {
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

  /* ------------------------------------------------------------------------ */
  /* Delete Category                                                          */
  /* ------------------------------------------------------------------------ */

  app.delete(
    "/admin/categories/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const { id } =
        request.params as {
          id: string;
        };

      try {
        const result =
          await deleteCategory(id);

        return {
          data: result,
        };
      } catch (error) {
        request.log.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Failed to delete category";

        if (message === "Category not found") {
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