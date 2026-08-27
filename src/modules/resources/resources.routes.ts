import type { FastifyInstance } from "fastify";

import {
  getPublishedResourceBySlug,
  getPublishedResources,
} from "./resources.service.js";

import {
  listPublicCategories,
  getPublicCategoryBySlug,
} from "./categories.service.js";

/* -------------------------------------------------------------------------- */
/* Resource Types                                                             */
/* -------------------------------------------------------------------------- */

const resourceTypes = [
  "SERMON",
  "EBOOK",
  "SONG",
  "VIDEO",
  "PODCAST",
  "ARTICLE",
] as const;

type ResourceType =
  (typeof resourceTypes)[number];

/* -------------------------------------------------------------------------- */
/* Public Resource Routes                                                     */
/* -------------------------------------------------------------------------- */

export async function resourceRoutes(
  app: FastifyInstance,
) {
  /* ------------------------------------------------------------------------ */
  /* List Resources                                                           */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/resources",
    async (request, reply) => {
      const query = request.query as {
        page?: string;
        limit?: string;
        type?: string;
        category?: string;
        featured?: string;
        search?: string;
      };

      /* -------------------------------------------------------------------- */
      /* Pagination                                                           */
      /* -------------------------------------------------------------------- */

      const page = query.page
        ? Number(query.page)
        : 1;

      const limit = query.limit
        ? Number(query.limit)
        : 12;

      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        return reply.code(400).send({
          error: "Invalid page",
        });
      }

      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 50
      ) {
        return reply.code(400).send({
          error: "Limit must be between 1 and 50",
        });
      }

      /* -------------------------------------------------------------------- */
      /* Resource Type                                                        */
      /* -------------------------------------------------------------------- */

      let type: ResourceType | undefined;

      if (query.type) {
        if (
          !resourceTypes.includes(
            query.type as ResourceType,
          )
        ) {
          return reply.code(400).send({
            error: "Invalid resource type",
          });
        }

        type =
          query.type as ResourceType;
      }

      /* -------------------------------------------------------------------- */
      /* Featured                                                             */
      /* -------------------------------------------------------------------- */

      let featured: boolean | undefined;

      if (
        query.featured !== undefined
      ) {
        if (
          query.featured !== "true" &&
          query.featured !== "false"
        ) {
          return reply.code(400).send({
            error:
              "Featured must be true or false",
          });
        }

        featured =
          query.featured === "true";
      }

      /* -------------------------------------------------------------------- */
      /* Search                                                               */
      /* -------------------------------------------------------------------- */

      const search =
        query.search?.trim() || undefined;

      /* -------------------------------------------------------------------- */
      /* Fetch                                                                */
      /* -------------------------------------------------------------------- */

      const result =
        await getPublishedResources({
          page,
          limit,
          type,
          category: query.category,
          featured,
          search,
        });

      return result;
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Single Resource                                                          */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/resources/:slug",
    async (request, reply) => {
      const { slug } =
        request.params as {
          slug: string;
        };

      const resource =
        await getPublishedResourceBySlug(
          slug,
        );

      if (!resource) {
        return reply.code(404).send({
          error: "Resource not found",
        });
      }

      return {
        data: resource,
      };
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Public Categories                                                        */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/categories",
    async (_request, reply) => {
      try {
        const categories =
          await listPublicCategories();

        return {
          data: categories,
        };
      } catch (error) {
        requestLog(
          app,
          error,
          "Failed to load categories",
        );

        return reply.code(500).send({
          error:
            "Failed to load categories",
        });
      }
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Single Public Category                                                   */
  /* ------------------------------------------------------------------------ */

  app.get(
    "/categories/:slug",
    async (request, reply) => {
      const { slug } =
        request.params as {
          slug: string;
        };

      try {
        const category =
          await getPublicCategoryBySlug(
            slug,
          );

        if (!category) {
          return reply.code(404).send({
            error: "Category not found",
          });
        }

        return {
          data: category,
        };
      } catch (error) {
        requestLog(
          app,
          error,
          "Failed to load category",
        );

        return reply.code(500).send({
          error:
            "Failed to load category",
        });
      }
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Logging Helper                                                             */
/* -------------------------------------------------------------------------- */

function requestLog(
  app: FastifyInstance,
  error: unknown,
  message: string,
) {
  app.log.error(
    {
      error,
    },
    message,
  );
}