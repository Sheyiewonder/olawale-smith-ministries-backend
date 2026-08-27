import { prisma } from "../../lib/prisma.js";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
}

/* -------------------------------------------------------------------------- */
/* List Categories                                                            */
/* -------------------------------------------------------------------------- */

export async function listAdminCategories() {
  return prisma.category.findMany({
    orderBy: {
      createdAt: "desc",
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
/* Get Category                                                               */
/* -------------------------------------------------------------------------- */

export async function getAdminCategory(id: string) {
  return prisma.category.findUnique({
    where: {
      id,
    },

    include: {
      _count: {
        select: {
          resources: true,
        },
      },

      resources: {
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              published: true,
            },
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Create Category                                                            */
/* -------------------------------------------------------------------------- */

export async function createCategory(
  input: CreateCategoryInput,
) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const description =
    input.description?.trim() || null;

  if (!name) {
    throw new Error("Category name is required");
  }

  if (!slug) {
    throw new Error("Category slug is required");
  }

  const existing = await prisma.category.findUnique({
    where: {
      slug,
    },
  });

  if (existing) {
    throw new Error(
      "A category with this slug already exists",
    );
  }

  return prisma.category.create({
    data: {
      name,
      slug,
      description,
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
/* Update Category                                                            */
/* -------------------------------------------------------------------------- */

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
) {
  const existing = await prisma.category.findUnique({
    where: {
      id,
    },
  });

  if (!existing) {
    throw new Error("Category not found");
  }

  if (input.name !== undefined) {
    const name = input.name.trim();

    if (!name) {
      throw new Error("Category name cannot be empty");
    }
  }

  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase();

    if (!slug) {
      throw new Error("Category slug cannot be empty");
    }

    const slugOwner =
      await prisma.category.findUnique({
        where: {
          slug,
        },
      });

    if (slugOwner && slugOwner.id !== id) {
      throw new Error(
        "A category with this slug already exists",
      );
    }
  }

  return prisma.category.update({
    where: {
      id,
    },

    data: {
      ...(input.name !== undefined && {
        name: input.name.trim(),
      }),

      ...(input.slug !== undefined && {
        slug: input.slug.trim().toLowerCase(),
      }),

      ...(input.description !== undefined && {
        description:
          input.description?.trim() || null,
      }),
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
/* Delete Category                                                            */
/* -------------------------------------------------------------------------- */

export async function deleteCategory(id: string) {
  const existing =
    await prisma.category.findUnique({
      where: {
        id,
      },

      include: {
        _count: {
          select: {
            resources: true,
          },
        },
      },
    });

  if (!existing) {
    throw new Error("Category not found");
  }

  if (existing._count.resources > 0) {
    throw new Error(
      "Cannot delete a category that is assigned to resources",
    );
  }

  await prisma.category.delete({
    where: {
      id,
    },
  });

  return {
    success: true,
  };
}