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

  if (
    typeof error === "object" &&
    error !== null
  ) {
    const value = error as {
      message?: unknown;
      error?: unknown;
    };

    if (
      typeof value.message === "string" &&
      value.message.trim()
    ) {
      return value.message;
    }

    if (
      typeof value.error === "object" &&
      value.error !== null
    ) {
      const nested = value.error as {
        message?: unknown;
      };

      if (
        typeof nested.message === "string" &&
        nested.message.trim()
      ) {
        return nested.message;
      }
    }

    if (
      typeof value.error === "string" &&
      value.error.trim()
    ) {
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

        /* ------------------------------------------------------------------ */
        /* Parse Multipart Form Data                                          */
        /* ------------------------------------------------------------------ */

        for await (const part of request.parts()) {
          if (part.type === "field") {
            if (part.fieldname === "type") {
              resourceType = part.value;
            }

            continue;
          }

          /*
           * We only expect one uploaded file.
           * Ignore additional file parts rather than
           * accidentally uploading multiple files.
           */
          if (buffer) {
            continue;
          }

          filename = part.filename;
          mimeType = part.mimetype;

          buffer = await part.toBuffer();
        }

        /* ------------------------------------------------------------------ */
        /* Validate File                                                      */
        /* ------------------------------------------------------------------ */

        if (!buffer) {
          return reply.code(400).send({
            error: "No file uploaded.",
          });
        }

        if (
          typeof resourceType !== "string" ||
          !resourceType.trim()
        ) {
          return reply.code(400).send({
            error: "Media type is required.",
          });
        }

        const normalizedResourceType =
          resourceType.trim().toUpperCase();

        /* ------------------------------------------------------------------ */
        /* Validate Media Type                                                */
        /* ------------------------------------------------------------------ */

        if (
          !isValidUploadType(
            normalizedResourceType,
          )
        ) {
          return reply.code(400).send({
            error:
              "Invalid media type. Use AUDIO, PDF, or IMAGE.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Validate Filename                                                  */
        /* ------------------------------------------------------------------ */

        if (!filename.trim()) {
          return reply.code(400).send({
            error: "Uploaded file has no filename.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Validate MIME Type                                                  */
        /* ------------------------------------------------------------------ */

        const normalizedMimeType =
          mimeType.trim().toLowerCase();

        const isAllowed =
          allowedMimeTypes[
            normalizedResourceType
          ](normalizedMimeType);

        if (!isAllowed) {
          return reply.code(400).send({
            error:
              `Invalid file type for ${normalizedResourceType}: ${
                mimeType || "unknown"
              }.`,
          });
        }

        /* ------------------------------------------------------------------ */
        /* Validate File Size / Content                                       */
        /* ------------------------------------------------------------------ */

        if (buffer.length === 0) {
          return reply.code(400).send({
            error: "Uploaded file is empty.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Upload to Cloudinary                                                */
        /* ------------------------------------------------------------------ */

        const uploaded = await uploadMedia({
          buffer,
          filename,
          mimeType: normalizedMimeType,
          type: normalizedResourceType,
        });

        /* ------------------------------------------------------------------ */
        /* Response                                                            */
        /* ------------------------------------------------------------------ */

        return reply.code(201).send({
          success: true,

          data: {
            publicId: uploaded.publicId,

            url: uploaded.url,

            secureUrl: uploaded.secureUrl,

            resourceType:
              uploaded.resourceType,

            format: uploaded.format,

            bytes: uploaded.bytes,

            duration: uploaded.duration,

            originalFilename:
              uploaded.originalFilename,

            mimeType: uploaded.mimeType,

            /*
             * For PDFs this is the Cloudinary-generated
             * first-page JPG thumbnail.
             *
             * For other media this may be undefined.
             */
            thumbnailUrl:
              uploaded.thumbnailUrl,

            type: normalizedResourceType,
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