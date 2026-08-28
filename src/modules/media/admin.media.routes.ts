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
    "image/jpg",
    "image/png",
    "image/webp",
    "Image/gif",
    "image/svg+xml",
    "image/tiff",
    "image/bmp",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/jiff",
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

        const allowed =
          allowedMimeTypes[
            resourceType
          ];

        if (
          !allowed.includes(
            mimeType,
          )
        ) {
          return reply.code(400).send({
            error:
              `Invalid file type for ${resourceType}.`,
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
            error instanceof Error
              ? error.message
              : "Failed to upload media.",
        });
      }
    },
  );
}