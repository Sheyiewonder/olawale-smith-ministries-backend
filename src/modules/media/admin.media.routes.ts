import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../lib/auth.js";

import {
  uploadMedia,
  type UploadMediaType,
} from "./media.service.js";

/* -------------------------------------------------------------------------- */
/* Allowed MIME Types                                                         */
/* -------------------------------------------------------------------------- */

const allowedMimeTypes: Record<
  UploadMediaType,
  (mimeType: string) => boolean
> = {
  AUDIO: (mimeType) =>
    mimeType.startsWith("audio/"),

  PDF: (mimeType) =>
    mimeType === "application/pdf",

  IMAGE: (mimeType) =>
    mimeType.startsWith("image/"),
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isValidUploadType(
  value: unknown,
): value is UploadMediaType {
  return (
    value === "AUDIO" ||
    value === "PDF" ||
    value === "IMAGE"
  );
}

function getUploadErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error) {
    const value = error as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof value.message === "string") {
      return value.message;
    }

    if (
      typeof value.error === "object" &&
      value.error
    ) {
      const nested = value.error as {
        message?: unknown;
      };

      if (
        typeof nested.message === "string"
      ) {
        return nested.message;
      }
    }

    if (typeof value.error === "string") {
      return value.error;
    }
  }

  return "Failed to upload media.";
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

export async function adminMediaRoutes(
  app: FastifyInstance,
) {
  app.post(
    "/admin/media/upload",
    {
      preHandler: requireAuth,
    },

    async (request, reply) => {
      try {
        let resourceType: unknown;
        let filename = "";
        let mimeType = "";
        let buffer: Buffer | undefined;

        for await (const part of request.parts()) {
          if (part.type === "field") {
            if (part.fieldname === "type") {
              resourceType = part.value;
            }

            continue;
          }

          if (!buffer) {
            filename = part.filename;
            mimeType = part.mimetype;
            buffer = await part.toBuffer();
          }
        }

        if (!buffer) {
          return reply.code(400).send({
            error:
              "No file uploaded.",
          });
        }

        if (
          typeof resourceType !== "string"
        ) {
          return reply.code(400).send({
            error:
              "Media type is required.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Validate Media Type                                                 */
        /* ------------------------------------------------------------------ */

        if (
          !isValidUploadType(
            resourceType,
          )
        ) {
          return reply.code(400).send({
            error:
              "Invalid media type. Use AUDIO, PDF, or IMAGE.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Validate MIME Type                                                  */
        /* ------------------------------------------------------------------ */

        const normalizedMimeType =
          mimeType.toLowerCase();

        const isAllowed =
          allowedMimeTypes[
            resourceType
          ](normalizedMimeType);

        if (!isAllowed) {
          return reply.code(400).send({
            error:
              `Invalid file type for ${resourceType}: ${mimeType || "unknown"}.`,
          });
        }

        /* ------------------------------------------------------------------ */
        /* Read File                                                           */
        /* ------------------------------------------------------------------ */

        if (buffer.length === 0) {
          return reply.code(400).send({
            error:
              "Uploaded file is empty.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Upload to Cloudinary                                                */
        /* ------------------------------------------------------------------ */

        const uploaded =
          await uploadMedia({
            buffer,

            filename,

            mimeType,

            type:
              resourceType,
          });

        /* ------------------------------------------------------------------ */
        /* Response                                                            */
        /* ------------------------------------------------------------------ */

        return reply.code(201).send({
          success: true,

          data: {
            publicId:
              uploaded.publicId,

            url:
              uploaded.url,

            secureUrl:
              uploaded.secureUrl,

            resourceType:
              uploaded.resourceType,

            format:
              uploaded.format,

            bytes:
              uploaded.bytes,

            duration:
              uploaded.duration,

            originalFilename:
              uploaded.originalFilename,

            mimeType:
              uploaded.mimeType,

            type:
              resourceType,
          },
        });
      } catch (error) {
        request.log.error(
          error,
          "Cloudinary media upload failed",
        );

        return reply.code(500).send({
          error:
            getUploadErrorMessage(error),
        });
      }
    },
  );
}