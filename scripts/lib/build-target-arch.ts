export type BuildArch = "arm64" | "x64" | "universal";
export type BuildPlatform = "mac" | "linux" | "win";

interface PlatformConfig<Arch extends BuildArch = BuildArch> {
  readonly archChoices: ReadonlyArray<Arch>;
}

function normalizeWindowsArch(value: string | undefined): BuildArch | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("arm64") || normalized === "aarch64") return "arm64";
  if (normalized.includes("amd64") || normalized.includes("x64")) return "x64";
  return undefined;
}

export function resolveHostProcessArch(
  platform: NodeJS.Platform,
  processArch: NodeJS.Architecture,
  env: NodeJS.ProcessEnv,
): BuildArch | undefined {
  if (processArch === "arm64") return "arm64";
  if (processArch === "x64") {
    if (platform !== "win32") return "x64";

    // On Windows-on-Arm, x64 Node/Bun can run under emulation while the host
    // still reports ARM64 via the processor environment variables.
    return (
      normalizeWindowsArch(env.PROCESSOR_ARCHITEW6432) ??
      normalizeWindowsArch(env.PROCESSOR_ARCHITECTURE) ??
      "x64"
    );
  }
  return undefined;
}

export function getDefaultBuildArch<Arch extends BuildArch = BuildArch>(
  platform: BuildPlatform,
  processArch: NodeJS.Architecture,
  env: NodeJS.ProcessEnv,
  platformConfig: PlatformConfig<Arch>,
): Arch;
export function getDefaultBuildArch<Arch extends BuildArch = BuildArch>(
  platform: BuildPlatform,
  processArch: NodeJS.Architecture,
  env: NodeJS.ProcessEnv,
  platformConfig: PlatformConfig<Arch>,
): Arch {
  const hostPlatform: NodeJS.Platform =
    platform === "win" ? "win32" : platform === "mac" ? "darwin" : "linux";
  const hostArch = resolveHostProcessArch(hostPlatform, processArch, env);
  if (hostArch && (platformConfig.archChoices as ReadonlyArray<BuildArch>).includes(hostArch)) {
    return hostArch as Arch;
  }

  return platformConfig.archChoices[0] ?? ("x64" as Arch);
}
