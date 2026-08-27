import { v2 as cloudinary } from "cloudinary";

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME;

const apiKey =
  process.env.CLOUDINARY_API_KEY;

const apiSecret =
  process.env.CLOUDINARY_API_SECRET;

if (!cloudName) {
  throw new Error(
    "CLOUDINARY_CLOUD_NAME is not configured",
  );
}

if (!apiKey) {
  throw new Error(
    "CLOUDINARY_API_KEY is not configured",
  );
}

if (!apiSecret) {
  throw new Error(
    "CLOUDINARY_API_SECRET is not configured",
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export default cloudinary;