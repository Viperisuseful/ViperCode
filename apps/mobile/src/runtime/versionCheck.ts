export const MOBILE_APP_VERSION = "0.3.7";

export interface VersionMismatch {
  readonly clientVersion: string;
  readonly serverVersion: string;
}

export function checkVersionDrift(serverVersion: string | null): VersionMismatch | null {
  if (!serverVersion) return null;

  const client = parseSemver(MOBILE_APP_VERSION);
  const server = parseSemver(serverVersion);

  if (!client || !server) return null;

  if (client.major !== server.major) {
    return { clientVersion: MOBILE_APP_VERSION, serverVersion };
  }

  return null;
}

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
  };
}
