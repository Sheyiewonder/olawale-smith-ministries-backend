import { prisma } from "../../lib/prisma.js";

/* -------------------------------------------------------------------------- */
/* Public Categories                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns categories that are available on the public resources website.
 *
 * Admin category creation, updating, and deletion are handled separately in:
 *
 * src/modules/categories/admin.categories.service.ts
 */
export async function listPublicCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },

    include: {
      _count: {
        select: {
          resources: true,
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Public Category By Slug                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Gets a category by its public slug.
 *
 * Resources attached to the category are limited to published resources.
 */
export async function getPublicCategoryBySlug(
  slug: string,
) {
  const normalizedSlug = slug
    .trim()
    .toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  return prisma.category.findUnique({
    where: {
      slug: normalizedSlug,
    },

    include: {
      _count: {
        select: {
          resources: {
            where: {
              resource: {
                published: true,
              },
            },
          },
        },
      },

      resources: {
        where: {
          resource: {
            published: true,
          },
        },

        orderBy: {
          resource: {
            createdAt: "desc",
          },
        },

        include: {
          resource: {
            include: {
              media: true,
              thumbnail: true,
            },
          },
        },
      },
    },
  });
}