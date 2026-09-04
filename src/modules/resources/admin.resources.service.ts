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
   */
  fileSize?: string | null;

  duration?: number | null;

  /**
   * URL for a media-specific thumbnail.
   *
   * - PDF: automatically generated first-page JPG
   * - AUDIO: optional uploaded cover/thumbnail image
   * - IMAGE: normally not required
   * - VIDEO: can be used when supplied by the external provider
   */
  thumbnailUrl?: string | null;
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

  thumbnail?: ResourceMediaInput;

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
 * This keeps all media fields, including thumbnailUrl, when a media asset
 * is created.
 */
function toMediaCreateData(
  media: ResourceMediaInput,
): Prisma.MediaAssetCreateWithoutResourceInput {
  return {
    type: media.type,
    provider: media.provider,

    title:
      media.title?.trim() || null,

    url:
      media.url?.trim() || null,

    storageKey:
      media.storageKey?.trim() || null,

    externalId:
      media.externalId?.trim() || null,

    mimeType:
      media.mimeType?.trim() || null,

    fileSize:
      media.fileSize !== undefined &&
      media.fileSize !== null
        ? String(media.fileSize)
        : null,

    duration:
      media.duration ?? null,

    thumbnailUrl:
      media.thumbnailUrl?.trim() || null,
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

  const resource = await prisma.resource.create({
    data: {
      title:
        input.title.trim(),

      slug:
        input.slug.trim(),

      description:
        input.description?.trim() || null,

      content:
        input.content?.trim() || null,

      type:
        input.type,

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

  /* ------------------------------------------------------------------------ */
  /* Resource Thumbnail                                                       */
  /* ------------------------------------------------------------------------ */

  /**
   * If the admin explicitly supplied a resource thumbnail,
   * use it.
   *
   * We no longer create a separate thumbnail automatically
   * from the PDF URL.
   *
   * PDF media now stores its own thumbnailUrl directly.
   */
  if (input.thumbnail) {
    const thumbnail =
      await prisma.mediaAsset.create({
        data: {
          ...toMediaCreateData(
            input.thumbnail,
          ),

          thumbnailFor: {
            connect: {
              id: resource.id,
            },
          },
        },
      });

    await prisma.resource.update({
      where: {
        id: resource.id,
      },

      data: {
        thumbnailId:
          thumbnail.id,
      },
    });
  }

  /* ------------------------------------------------------------------------ */
  /* Return Created Resource                                                  */
  /* ------------------------------------------------------------------------ */

  return prisma.resource.findUnique({
    where: {
      id: resource.id,
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
    throw new Error(
      "Resource not found",
    );
  }

  return prisma.$transaction(
    async (tx) => {
      /* -------------------------------------------------------------------- */
      /* Basic Resource Fields                                                */
      /* -------------------------------------------------------------------- */

      await tx.resource.update({
        where: {
          id,
        },

        data: {
          ...(input.title !== undefined && {
            title:
              input.title.trim(),
          }),

          ...(input.slug !== undefined && {
            slug:
              input.slug.trim(),
          }),

          ...(input.description !== undefined && {
            description:
              input.description?.trim() ||
              null,
          }),

          ...(input.content !== undefined && {
            content:
              input.content?.trim() ||
              null,
          }),

          ...(input.type !== undefined && {
            type:
              input.type,
          }),

          ...(input.speaker !== undefined && {
            speaker:
              input.speaker?.trim() ||
              null,
          }),

          ...(input.duration !== undefined && {
            duration:
              input.duration,
          }),

          ...(input.featured !== undefined && {
            featured:
              input.featured,
          }),

          ...(input.published !== undefined && {
            published:
              input.published,

            publishedAt:
              input.published
                ? existing.publishedAt ??
                  new Date()
                : null,
          }),

          ...(input.publishedAt !== undefined && {
            publishedAt:
              input.publishedAt
                ? new Date(
                    input.publishedAt,
                  )
                : null,
          }),

          ...(input.seriesId !== undefined && {
            seriesId:
              input.seriesId || null,
          }),
        },
      });

      /* -------------------------------------------------------------------- */
      /* Categories                                                           */
      /* -------------------------------------------------------------------- */

      if (
        input.categoryIds !== undefined
      ) {
        await tx.resourceCategory.deleteMany({
          where: {
            resourceId: id,
          },
        });

        if (
          input.categoryIds.length > 0
        ) {
          await tx.resourceCategory.createMany({
            data:
              input.categoryIds.map(
                (categoryId) => ({
                  resourceId: id,
                  categoryId,
                }),
              ),

            skipDuplicates: true,
          });
        }
      }

      /* -------------------------------------------------------------------- */
      /* Tags                                                                 */
      /* -------------------------------------------------------------------- */

      if (
        input.tagIds !== undefined
      ) {
        await tx.resourceTag.deleteMany({
          where: {
            resourceId: id,
          },
        });

        if (
          input.tagIds.length > 0
        ) {
          await tx.resourceTag.createMany({
            data:
              input.tagIds.map(
                (tagId) => ({
                  resourceId: id,
                  tagId,
                }),
              ),

            skipDuplicates: true,
          });
        }
      }

      /* -------------------------------------------------------------------- */
      /* Media                                                                */
      /* -------------------------------------------------------------------- */

      if (
        input.media !== undefined
      ) {
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

        if (
          input.media.length > 0
        ) {
          await tx.mediaAsset.createMany({
            data:
              input.media.map(
                (media) => ({
                  resourceId: id,

                  type:
                    media.type,

                  provider:
                    media.provider,

                  title:
                    media.title?.trim() ||
                    null,

                  url:
                    media.url?.trim() ||
                    null,

                  storageKey:
                    media.storageKey?.trim() ||
                    null,

                  externalId:
                    media.externalId?.trim() ||
                    null,

                  mimeType:
                    media.mimeType?.trim() ||
                    null,

                  fileSize:
                    media.fileSize !==
                      undefined &&
                    media.fileSize !==
                      null
                      ? String(
                          media.fileSize,
                        )
                      : null,

                  duration:
                    media.duration ??
                    null,

                  /*
                   * IMPORTANT:
                   *
                   * Preserve the media-specific
                   * thumbnail URL when editing.
                   *
                   * This is what allows PDF and
                   * audio thumbnails to survive
                   * resource edits.
                   */
                  thumbnailUrl:
                    media.thumbnailUrl
                      ?.trim() ||
                    null,
                }),
              ),
          });
        }

        /* ------------------------------------------------------------------ */
        /* Resource Thumbnail                                                 */
        /* ------------------------------------------------------------------ */

        /**
         * Do NOT select the first IMAGE media as the
         * resource thumbnail automatically.
         *
         * An IMAGE may be an audio cover, article image,
         * etc. It should not automatically become the
         * resource's primary thumbnail.
         *
         * The explicit `input.thumbnail` controls the
         * resource-level thumbnail.
         */
        if (
          input.thumbnail === undefined
        ) {
          /*
           * Keep the existing resource thumbnail.
           *
           * Deleting/recreating media above does not
           * affect the separately linked thumbnail asset.
           */
        }
      }

      /* -------------------------------------------------------------------- */
      /* Explicit Resource Thumbnail                                          */
      /* -------------------------------------------------------------------- */

      if (
        input.thumbnail !== undefined
      ) {
        /*
         * Get the current resource-level
         * thumbnail before replacing it.
         */
        const currentResource =
          await tx.resource.findUnique({
            where: {
              id,
            },

            select: {
              thumbnailId: true,
            },
          });

        /*
         * IMPORTANT:
         *
         * Clear the foreign-key reference BEFORE
         * deleting the old MediaAsset.
         *
         * Resource.thumbnailId points to MediaAsset.id,
         * so deleting the MediaAsset while the Resource
         * still references it can violate the FK constraint.
         */
        if (
          currentResource?.thumbnailId
        ) {
          await tx.resource.update({
            where: {
              id,
            },

            data: {
              thumbnailId: null,
            },
          });

          await tx.mediaAsset.delete({
            where: {
              id:
                currentResource.thumbnailId,
            },
          });
        }

        /*
         * If a new thumbnail was supplied, create it
         * as a separate MediaAsset and connect it to
         * the resource through the ResourceThumbnail
         * relation.
         */
        const thumbnail =
          input.thumbnail
            ? await tx.mediaAsset.create({
                data: {
                  ...toMediaCreateData(
                    input.thumbnail,
                  ),

                  thumbnailFor: {
                    connect: {
                      id,
                    },
                  },
                },
              })
            : null;

        await tx.resource.update({
          where: {
            id,
          },

          data: {
            thumbnailId:
              thumbnail?.id ?? null,
          },
        });
      }

      /* -------------------------------------------------------------------- */
      /* Return Updated Resource                                              */
      /* -------------------------------------------------------------------- */

      return tx.resource.findUnique({
        where: {
          id,
        },

        include: resourceInclude,
      });
    },
  );
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

      select: {
        thumbnailId: true,
      },
    });

  if (!existing) {
    throw new Error(
      "Resource not found",
    );
  }

  /*
   * Resource media is deleted automatically by the
   * ResourceMedia relation's onDelete: Cascade.
   *
   * The resource-level thumbnail is a separate
   * MediaAsset, however, so we clean it up explicitly
   * to avoid leaving an orphaned thumbnail record.
   */
  const thumbnailId =
    existing.thumbnailId;

  await prisma.resource.delete({
    where: {
      id,
    },
  });

  if (thumbnailId) {
    await prisma.mediaAsset.delete({
      where: {
        id: thumbnailId,
      },
    });
  }

  return {
    success: true,
  };
}
