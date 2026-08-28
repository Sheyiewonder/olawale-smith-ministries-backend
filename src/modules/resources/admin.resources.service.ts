import { prisma } from "../../lib/prisma.js";

import type {
  MediaProvider,
  MediaType,
  Prisma,
  ResourceType,
} from "@prisma/client";

/* -------------------------------------------------------------------------- */
/* Shared Types                                                               */
/* -------------------------------------------------------------------------- */

interface ResourceMediaInput {
  type: MediaType;
  provider: MediaProvider;

  title?: string | null;
  url?: string | null;
  storageKey?: string | null;
  externalId?: string | null;

  mimeType?: string | null;

  /**
   * MediaAsset.fileSize is String? in schema.prisma.
   *
   * Keep this as a string throughout the service.
   */
  fileSize?: string | null;

  duration?: number | null;
}

interface CreateResourceInput {
  title: string;
  slug: string;

  description?: string | null;
  content?: string | null;

  type: ResourceType;

  speaker?: string | null;
  duration?: number | null;

  featured?: boolean;
  published?: boolean;

  publishedAt?: string | null;

  categoryIds?: string[];
  tagIds?: string[];

  seriesId?: string | null;

  media?: ResourceMediaInput[];
}

export type UpdateResourceInput =
  Partial<CreateResourceInput>;

/* -------------------------------------------------------------------------- */
/* Media Helper                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Converts our service media input into Prisma's nested media-create input.
 *
 * This explicitly tells TypeScript that fileSize is a string,
 * matching:
 *
 * fileSize String?
 *
 * in schema.prisma.
 */
function toMediaCreateData(
  media: ResourceMediaInput,
): Prisma.MediaAssetCreateWithoutResourceInput {
  return {
    type: media.type,
    provider: media.provider,

    title: media.title || null,
    url: media.url || null,
    storageKey: media.storageKey || null,
    externalId: media.externalId || null,
    mimeType: media.mimeType || null,

    fileSize:
      media.fileSize !== undefined &&
      media.fileSize !== null
        ? String(media.fileSize)
        : null,

    duration: media.duration ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Resource Include                                                           */
/* -------------------------------------------------------------------------- */

const resourceInclude = {
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

  media: true,
  thumbnail: true,
  series: true,
};

/* -------------------------------------------------------------------------- */
/* List Admin Resources                                                       */
/* -------------------------------------------------------------------------- */

export async function listAdminResources() {
  return prisma.resource.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: resourceInclude,
  });
}

/* -------------------------------------------------------------------------- */
/* Get Admin Resource                                                         */
/* -------------------------------------------------------------------------- */

export async function getAdminResource(
  id: string,
) {
  return prisma.resource.findUnique({
    where: {
      id,
    },

    include: resourceInclude,
  });
}

/* -------------------------------------------------------------------------- */
/* Create Resource                                                            */
/* -------------------------------------------------------------------------- */

export async function createResource(
  input: CreateResourceInput,
) {
  const published =
    input.published ?? false;

  return prisma.resource.create({
    data: {
      title: input.title.trim(),

      slug: input.slug.trim(),

      description:
        input.description?.trim() || null,

      content:
        input.content?.trim() || null,

      type: input.type,

      speaker:
        input.speaker?.trim() || null,

      duration:
        input.duration ?? null,

      featured:
        input.featured ?? false,

      published,

      publishedAt:
        input.publishedAt
          ? new Date(input.publishedAt)
          : published
            ? new Date()
            : null,

      seriesId:
        input.seriesId || null,

      /* ------------------------------------------------------------------ */
      /* Categories                                                         */
      /* ------------------------------------------------------------------ */

      categories:
        input.categoryIds?.length
          ? {
              create:
                input.categoryIds.map(
                  (categoryId) => ({
                    category: {
                      connect: {
                        id: categoryId,
                      },
                    },
                  }),
                ),
            }
          : undefined,

      /* ------------------------------------------------------------------ */
      /* Tags                                                               */
      /* ------------------------------------------------------------------ */

      tags:
        input.tagIds?.length
          ? {
              create:
                input.tagIds.map(
                  (tagId) => ({
                    tag: {
                      connect: {
                        id: tagId,
                      },
                    },
                  }),
                ),
            }
          : undefined,

      /* ------------------------------------------------------------------ */
      /* Media                                                              */
      /* ------------------------------------------------------------------ */

      media:
        input.media?.length
          ? {
              create:
                input.media.map(
                  toMediaCreateData,
                ),
            }
          : undefined,
    },

    include: resourceInclude,
  });
}

/* -------------------------------------------------------------------------- */
/* Update Resource                                                            */
/* -------------------------------------------------------------------------- */

export async function updateResource(
  id: string,
  input: UpdateResourceInput,
) {
  const existing =
    await prisma.resource.findUnique({
      where: {
        id,
      },
    });

  if (!existing) {
    throw new Error("Resource not found");
  }

  return prisma.$transaction(async (tx) => {
    /* ---------------------------------------------------------------------- */
    /* Basic Resource Fields                                                  */
    /* ---------------------------------------------------------------------- */

    await tx.resource.update({
      where: {
        id,
      },

      data: {
        ...(input.title !== undefined && {
          title: input.title.trim(),
        }),

        ...(input.slug !== undefined && {
          slug: input.slug.trim(),
        }),

        ...(input.description !== undefined && {
          description:
            input.description?.trim() || null,
        }),

        ...(input.content !== undefined && {
          content:
            input.content?.trim() || null,
        }),

        ...(input.type !== undefined && {
          type: input.type,
        }),

        ...(input.speaker !== undefined && {
          speaker:
            input.speaker?.trim() || null,
        }),

        ...(input.duration !== undefined && {
          duration: input.duration,
        }),

        ...(input.featured !== undefined && {
          featured: input.featured,
        }),

        ...(input.published !== undefined && {
          published: input.published,

          publishedAt: input.published
            ? existing.publishedAt ??
              new Date()
            : null,
        }),

        ...(input.publishedAt !== undefined && {
          publishedAt: input.publishedAt
            ? new Date(input.publishedAt)
            : null,
        }),

        ...(input.seriesId !== undefined && {
          seriesId:
            input.seriesId || null,
        }),
      },
    });

    /* ---------------------------------------------------------------------- */
    /* Categories                                                             */
    /* ---------------------------------------------------------------------- */

    if (input.categoryIds !== undefined) {
      await tx.resourceCategory.deleteMany({
        where: {
          resourceId: id,
        },
      });

      if (input.categoryIds.length > 0) {
        await tx.resourceCategory.createMany({
          data: input.categoryIds.map(
            (categoryId) => ({
              resourceId: id,
              categoryId,
            }),
          ),

          skipDuplicates: true,
        });
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Tags                                                                   */
    /* ---------------------------------------------------------------------- */

    if (input.tagIds !== undefined) {
      await tx.resourceTag.deleteMany({
        where: {
          resourceId: id,
        },
      });

      if (input.tagIds.length > 0) {
        await tx.resourceTag.createMany({
          data: input.tagIds.map(
            (tagId) => ({
              resourceId: id,
              tagId,
            }),
          ),

          skipDuplicates: true,
        });
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Media                                                                  */
    /* ---------------------------------------------------------------------- */

    if (input.media !== undefined) {
      /**
       * The edit page sends the complete current
       * media collection.
       *
       * Therefore:
       *
       * media: []
       *
       * means remove all media from the resource.
       */

      await tx.mediaAsset.deleteMany({
        where: {
          resourceId: id,
        },
      });

      if (input.media.length > 0) {
        await tx.mediaAsset.createMany({
          data: input.media.map(
            (media) => ({
              resourceId: id,

              type: media.type,

              provider:
                media.provider,

              title:
                media.title || null,

              url:
                media.url || null,

              storageKey:
                media.storageKey || null,

              externalId:
                media.externalId || null,

              mimeType:
                media.mimeType || null,

              fileSize:
                media.fileSize !== undefined &&
                media.fileSize !== null
                  ? String(
                      media.fileSize,
                    )
                  : null,

              duration:
                media.duration ?? null,
            }),
          ),
        });
      }
    }

    /* ---------------------------------------------------------------------- */
    /* Return Updated Resource                                                */
    /* ---------------------------------------------------------------------- */

    return tx.resource.findUnique({
      where: {
        id,
      },

      include: resourceInclude,
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Delete Resource                                                            */
/* -------------------------------------------------------------------------- */

export async function deleteResource(
  id: string,
) {
  const existing =
    await prisma.resource.findUnique({
      where: {
        id,
      },
    });

  if (!existing) {
    throw new Error(
      "Resource not found",
    );
  }

  await prisma.resource.delete({
    where: {
      id,
    },
  });

  return {
    success: true,
  };
}