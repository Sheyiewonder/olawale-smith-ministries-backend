import { Readable } from "node:stream";

import cloudinary from "../../lib/cloudinary.js";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type UploadMediaType =
  | "AUDIO"
  | "PDF"
  | "IMAGE";

export interface UploadMediaInput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  type: UploadMediaType;
}

export interface UploadedMedia {
  publicId: string;
  url: string;
  secureUrl: string;
  resourceType: string;
  format?: string;
  bytes: number;
  duration?: number;
  originalFilename: string;
  mimeType: string;

  /**
   * Cloudinary-generated first-page JPG thumbnail.
   *
   * Only populated for PDF uploads.
   */
  thumbnailUrl?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Maps our application media types to Cloudinary resource types.
 *
 * AUDIO -> video
 * IMAGE -> image
 * PDF   -> image
 *
 * PDFs intentionally use Cloudinary's image resource type so that
 * Cloudinary can generate page-based transformations/thumbnails.
 */
function getResourceType(
  type: UploadMediaType,
): "image" | "video" {
  switch (type) {
    case "IMAGE":
      return "image";

    case "AUDIO":
      return "video";

    case "PDF":
      return "image";
  }
}

/**
 * Determines the Cloudinary folder for each media type.
 */
function getFolder(
  type: UploadMediaType,
): string {
  switch (type) {
    case "AUDIO":
      return "olawale-smith/audio";

    case "PDF":
      return "olawale-smith/ebooks";

    case "IMAGE":
      return "olawale-smith/images";
  }
}

/**
 * Generates a secure JPG URL for the first page of a PDF.
 *
 * The PDF itself remains stored in Cloudinary.
 * This URL is only used as the resource thumbnail.
 */
function getPdfThumbnailUrl(
  publicId: string,
): string {
  return cloudinary.url(publicId, {
    resource_type: "image",
    type: "upload",
    secure: true,

    transformation: [
      {
        page: 1,
        width: 800,
        crop: "limit",
        quality: "auto",
        fetch_format: "jpg",
      },
    ],

    format: "jpg",
  });
}
/* -------------------------------------------------------------------------- */
/* Upload Media                                                               */
/* -------------------------------------------------------------------------- */

export async function uploadMedia(
  input: UploadMediaInput,
): Promise<UploadedMedia> {
  const resourceType =
    getResourceType(input.type);

  const folder =
    getFolder(input.type);

  return new Promise<UploadedMedia>(
    (resolve, reject) => {
      const uploadStream =
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,

            folder,

            /*
             * Preserve the original filename where possible.
             */
            use_filename: true,

            /*
             * Prevent collisions between files with
             * identical names.
             */
            unique_filename: true,

            overwrite: false,

            /*
             * Keep the original filename available
             * to Cloudinary.
             */
            filename_override:
              input.filename,

            original_filename:
              input.filename,

            /*
             * PDFs must remain PDFs even though they
             * are stored using Cloudinary's image
             * resource type.
             */
            ...(input.type === "PDF" && {
              format: "pdf",
            }),
          },

          (error, result) => {
            if (error) {
              console.error(
                "CLOUDINARY UPLOAD ERROR:",
                error,
              );

              reject(error);
              return;
            }

            if (!result) {
              reject(
                new Error(
                  "Cloudinary returned no upload result.",
                ),
              );

              return;
            }

            /*
             * Only PDFs receive an automatically
             * generated thumbnail.
             *
             * Audio thumbnails are handled separately
             * by the application when an admin supplies
             * an image thumbnail.
             */
            const thumbnailUrl =
              input.type === "PDF"
                ? getPdfThumbnailUrl(
                    result.public_id,
                  )
                : undefined;

            resolve({
              publicId:
                result.public_id,

              url:
                result.url,

              secureUrl:
                result.secure_url,

              resourceType:
                result.resource_type,

              format:
                result.format,

              bytes:
                result.bytes,

              duration:
                result.duration,

              originalFilename:
                input.filename,

              mimeType:
                input.mimeType,

              thumbnailUrl,
            });
          },
        );

      /*
       * Convert the uploaded Buffer into a readable
       * stream and pipe it into Cloudinary.
       */
      Readable
        .from(input.buffer)
        .pipe(uploadStream);
    },
  );
}

/* -------------------------------------------------------------------------- */
/* Delete Media                                                               */
/* -------------------------------------------------------------------------- */

export async function deleteMedia(
  publicId: string,
  type: UploadMediaType,
) {
  const resourceType =
    getResourceType(type);

  return cloudinary.uploader.destroy(
    publicId,
    {
      resource_type: resourceType,
      type: "upload",
    },
  );
}