import type { FastifyInstance } from "fastify";
// import type { MultipartFile } from "@fastify/multipart";

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
  string[]
> = {
  AUDIO: [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/aac",
    "audio/webm",
  ],

  PDF: [
    "application/pdf",
  ],

  IMAGE: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
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

/**
 * Extracts a text field from a multipart field.
 *
 * Fastify's multipart types allow a field to be either
 * a MultipartField or a MultipartFile, so we check for
 * the `value` property before accessing it.
 */
function getMultipartFieldValue(
  field: unknown,
): string | undefined {
  if (
    field &&
    typeof field === "object" &&
    "value" in field
  ) {
    const value = (
      field as {
        value?: unknown;
      }
    ).value;

    return typeof value === "string"
      ? value
      : undefined;
  }

  return undefined;
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
        /* ------------------------------------------------------------------ */
        /* Get uploaded file                                                  */
        /* ------------------------------------------------------------------ */

        const file =
          await request.file();

        if (!file) {
          return reply.code(400).send({
            error: "No file uploaded",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Get media type                                                     */
        /* ------------------------------------------------------------------ */

        const typeField =
          file.fields.type;

        const resourceType =
          getMultipartFieldValue(
            typeField,
          );

        if (!resourceType) {
          return reply.code(400).send({
            error:
              "Resource type is required",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Validate media type                                                */
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

        const mediaType =
          resourceType;

        /* ------------------------------------------------------------------ */
        /* Validate MIME type                                                 */
        /* ------------------------------------------------------------------ */

        const allowed =
          allowedMimeTypes[mediaType];

        if (
          !allowed.includes(
            file.mimetype,
          )
        ) {
          return reply.code(400).send({
            error: `Invalid file type for ${mediaType}`,
          });
        }

        /* ------------------------------------------------------------------ */
        /* Read file                                                          */
        /* ------------------------------------------------------------------ */

        const buffer =
          await file.toBuffer();

        /* ------------------------------------------------------------------ */
        /* Upload                                                             */
        /* ------------------------------------------------------------------ */

        const uploaded =
          await uploadMedia({
            buffer,

            filename:
              file.filename,

            mimeType:
              file.mimetype,

            type: mediaType,
          });

        /* ------------------------------------------------------------------ */
        /* Response                                                           */
        /* ------------------------------------------------------------------ */

        return reply.code(201).send({
          data: uploaded,
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          error:
            error instanceof Error
              ? error.message
              : "Failed to upload media",
        });
      }
    },
  );
}