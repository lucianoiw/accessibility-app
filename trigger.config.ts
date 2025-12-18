import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_lvknvyieavogpfpclxde",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  // Playwright e axe-core tem dependencias que nao podem ser bundled
  // axe-core precisa ser external para evitar que esbuild adicione __name helper
  build: {
    external: [
      "playwright",
      "playwright-core",
      "chromium-bidi",
      "axe-core",
      "@axe-core/playwright",
    ],
  },
});
