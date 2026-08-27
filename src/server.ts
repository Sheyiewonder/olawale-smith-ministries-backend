import "dotenv/config";

import { buildApp } from "./app.js";

const app = buildApp();

const port = Number(
  process.env.PORT ?? 4000,
);

async function startServer() {
  try {
    await app.listen({
      port,
      host: "0.0.0.0",
    });

    console.log(
      `API running on port ${port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

startServer();