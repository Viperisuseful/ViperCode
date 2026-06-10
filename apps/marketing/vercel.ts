import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  installCommand: "npm install -g vite-plus && vp install --filter '@vipercode/marketing'",
  buildCommand: "vp run --filter @vipercode/marketing build",
  outputDirectory: "dist",
};
