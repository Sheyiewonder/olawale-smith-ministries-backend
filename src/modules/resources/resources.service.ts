import { prisma } from "../../lib/prisma.js";
import type { Prisma, ResourceType } from "@prisma/client";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface GetResourcesOptions {
  page?: number;
  limit?: number;
  type?: ResourceType;
  category?: string;
  featured?: boolean;
  search?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Converts Prisma's ResourceCategory junction records into
 * the actual category objects expected by the frontend.
 */
function normalizeResource<T extends {
  categories?: Array<{
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
}>(resource: T) {
  return {
    ...resource,
    categories:
      resource.categories?.map(
        ({ category }) => category,
      ) ?? [],
  };
}

/**
 * Normalizes a collection of resources.
 */
function normalizeResources<
  T extends {
    categories?: Array<{
      category: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
    }>;
  },
>(resources: T[]) {
  return resources.map(normalizeResource);
}

/* -------------------------------------------------------------------------- */
/* List Published Resources                                                   */
/* -------------------------------------------------------------------------- */

export async function getPublishedResources(
  options: GetResourcesOptions = {},
) {
  const {
    page = 1,
    limit = 12,
    type,
    category,
    featured,
    search,
  } = options;

  const safePage = Math.max(
    1,
    Math.floor(page),
  );

  const safeLimit = Math.min(
    50,
    Math.max(1, Math.floor(limit)),
  );

  const skip = (safePage - 1) * safeLimit;

  const normalizedSearch =
    search?.trim() || undefined;

  const normalizedCategory =
    category?.trim().toLowerCase() ||
    undefined;

  /* ------------------------------------------------------------------------ */
  /* Query                                                                     */
  /* ------------------------------------------------------------------------ */

  const where: Prisma.ResourceWhereInput = {
    published: true,

    ...(type && {
      type,
    }),

    ...(featured !== undefined && {
      featured,
    }),

    ...(normalizedSearch && {
      OR: [
        {
          title: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
        {
          speaker: {
            contains: normalizedSearch,
            mode: "insensitive",
          },
        },
      ],
    }),

    ...(normalizedCategory && {
      categories: {
        some: {
          category: {
            slug: normalizedCategory,
          },
        },
      },
    }),
  };

  /* ------------------------------------------------------------------------ */
  /* Fetch                                                                     */
  /* ------------------------------------------------------------------------ */

  const [resources, total] =
    await prisma.$transaction([
      prisma.resource.findMany({
        where,

        skip,
        take: safeLimit,

        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        include: {
          media: true,

          thumbnail: true,

          categories: {
            include: {
              category: true,
            },
          },

          tags: {
            include: {
              tag: true,
            },
          },

          series: true,
        },
      }),

      prisma.resource.count({
        where,
      }),
    ]);

  /* ------------------------------------------------------------------------ */
  /* Response                                                                  */
  /* ------------------------------------------------------------------------ */

  return {
    data: normalizeResources(resources),

    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages:
        Math.ceil(total / safeLimit),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Get Published Resource By Slug                                             */
/* -------------------------------------------------------------------------- */

export async function getPublishedResourceBySlug(
  slug: string,
) {
  const normalizedSlug =
    slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  const resource =
    await prisma.resource.findFirst({
      where: {
        slug: normalizedSlug,
        published: true,
      },

      include: {
        media: true,

        thumbnail: true,

        categories: {
          include: {
            category: true,
          },
        },

        tags: {
          include: {
            tag: true,
          },
        },

        series: true,
      },
    });

  if (!resource) {
    return null;
  }

  return normalizeResource(resource);
}