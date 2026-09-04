import { v2 as cloudinary } from "cloudinary";

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

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

/* -------------------------------------------------------------------------- */
/* Cloudinary Configuration                                                    */
/* -------------------------------------------------------------------------- */

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

cloudinary.api
  .ping()
  .then((result) => {
    console.log(
      "Cloudinary connection successful:",
      result,
    );
  })
  .catch((error) => {
    console.error(
      "Cloudinary connection failed:",
      error,
    );
  });
  
export default cloudinary;