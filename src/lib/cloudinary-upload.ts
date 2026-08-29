import { Readable } from "node:stream";

import cloudinary from "./cloudinary.js";

export type CloudinaryFileType =
  | "image"
  | "audio"
  | "pdf";

interface UploadFileOptions {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder: string;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
  duration?: number;
}

function getResourceType(
  mimeType: string,
) {
  if (mimeType === "application/pdf") {
    return "raw";
  }

  if (mimeType.startsWith("audio/")) {
    return "video";
  }

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  throw new Error(
    `Unsupported Cloudinary file type: ${mimeType}`,
  );
}

export async function uploadFileToCloudinary({
  buffer,
  filename,
  mimeType,
  folder,
}: UploadFileOptions): Promise<CloudinaryUploadResult> {
  const resourceType =
    getResourceType(mimeType);

  return new Promise(
    (resolve, reject) => {
      const stream =
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,

            folder,

            use_filename: true,

            filename_override: filename,

            unique_filename: true,

            overwrite: false,

            original_filename: filename,
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
            });
          },
        );

      Readable.from(buffer).pipe(
        stream,
      );
    },
  );
}