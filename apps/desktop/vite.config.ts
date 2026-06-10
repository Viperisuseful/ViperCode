import { defineConfig } from "vite-plus";

import { loadRepoEnv } from "../../scripts/lib/public-config.ts";

const repoEnv = loadRepoEnv();
const shouldLaunchElectronAfterPack = process.env.VIPERCODE_DESKTOP_DEV === "1";
const publicConfigDefine = {
  __VIPERCODE_BUILD_CLERK_PUBLISHABLE_KEY__: JSON.stringify(
    repoEnv.VIPERCODE_CLERK_PUBLISHABLE_KEY?.trim() ?? "",
  ),
};

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "vp pack",
        dependsOn: ["vipercode#build"],
        cache: false,
      },
      dev: {
        command: "cross-env VIPERCODE_DESKTOP_DEV=1 vp pack --watch",
        dependsOn: ["vipercode#build"],
        cache: false,
      },
      "dev:bundle": {
        command: "vp pack --watch",
        cache: false,
      },
      "dev:electron": {
        command: "node scripts/dev-electron.mjs",
        dependsOn: ["vipercode#build"],
        cache: false,
      },
    },
  },
  pack: [
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      define: publicConfigDefine,
      entry: ["src/main.ts"],
      clean: true,
      deps: {
        alwaysBundle: (id) => id.startsWith("@vipercode/"),
      },
      ...(shouldLaunchElectronAfterPack ? { onSuccess: "node scripts/dev-electron.mjs" } : {}),
    },
    {
      format: "cjs",
      outDir: "dist-electron",
      sourcemap: true,
      outExtensions: () => ({ js: ".cjs" }),
      define: publicConfigDefine,
      entry: ["src/preload.ts"],
    },
  ],
});
