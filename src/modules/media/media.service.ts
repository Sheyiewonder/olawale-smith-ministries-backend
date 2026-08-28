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
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getResourceType(
  type: UploadMediaType,
): "image" | "video" | "raw" {
  switch (type) {
    case "IMAGE":
      return "image";

    /*
     * Cloudinary uses the "video" resource type
     * for audio files.
     */
    case "AUDIO":
      return "video";

    case "PDF":
      return "raw";
  }
}

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

            use_filename: true,
            unique_filename: true,
            overwrite: false,
          },

          (error, result) => {
            if (error) {
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
            });
          },
        );

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