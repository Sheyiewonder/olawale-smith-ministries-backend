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
     * Cloudinary stores audio using the
     * "video" resource type.
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
/* Upload                                                                     */
/* -------------------------------------------------------------------------- */

export async function uploadMedia(
  input: UploadMediaInput,
) {
  const resourceType =
    getResourceType(input.type);

  const folder =
    getFolder(input.type);

  return new Promise<{
    publicId: string;
    url: string;
    secureUrl: string;
    resourceType: string;
    format?: string;
    bytes: number;
    duration?: number;
    originalFilename: string;
  }>((resolve, reject) => {
    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,

          folder,

          /*
           * Preserve a readable version of the
           * original filename while allowing
           * Cloudinary to generate a unique ID.
           */
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
                "Cloudinary returned no upload result",
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
          });
        },
      );

    Readable
      .from(input.buffer)
      .pipe(uploadStream);
  });
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

export async function deleteMedia(
  publicId: string,
  type: UploadMediaType,
) {
  const resourceType =
    getResourceType(type);

  const result =
    await cloudinary.uploader.destroy(
      publicId,
      {
        resource_type: resourceType,
        type: "upload",
      },
    );

  return result;
}
