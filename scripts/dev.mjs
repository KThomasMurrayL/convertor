import { spawn } from "node:child_process";
import { createServer } from "vite";
import electron from "electron";

const server = await createServer();
await server.listen();

const url = server.resolvedUrls?.local?.[0];
if (!url) {
  await server.close();
  throw new Error("Vite dev server did not start");
}

console.log(`\n  Convertor dev server running at ${url}\n`);

const child = spawn(electron, ["."], {
  stdio: "inherit",
  env: { ...process.env, VITE_DEV_SERVER_URL: url },
});

const shutdown = async () => {
  await server.close().catch(() => {});
  process.exit(0);
};

child.on("exit", shutdown);
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
