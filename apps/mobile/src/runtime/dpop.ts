import { p256 } from "@noble/curves/nist";
import { sha256 } from "@noble/hashes/sha2";
import { randomBytes } from "@noble/hashes/utils";
import {
  type ManagedRelayDpopProofInput,
  ManagedRelayDpopSigner,
  ManagedRelayDpopSignerError,
} from "@vipercode/client-runtime";
import {
  computeDpopAccessTokenHash,
  computeDpopJwkThumbprint,
  type DpopPublicJwk,
} from "@vipercode/shared/dpop";
import * as Encoding from "effect/Encoding";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { readSecureJson, writeSecureJson } from "../storage/secureStorage.ts";

const DPOP_KEY_STORAGE_KEY = "vipercode:dpop-proof-key";

interface StoredMobileDpopKey {
  readonly privateHex: string;
  readonly publicJwk: DpopPublicJwk;
  readonly thumbprint: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Encoding.encodeBase64Url(bytes);
}

function generateMobileDpopKey(): StoredMobileDpopKey {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = p256.getPublicKey(privateKeyBytes, false);
  const x = base64UrlEncode(publicKeyBytes.slice(1, 33));
  const y = base64UrlEncode(publicKeyBytes.slice(33, 65));
  const publicJwk: DpopPublicJwk = { kty: "EC", crv: "P-256", x, y };
  return {
    privateHex: bytesToHex(privateKeyBytes),
    publicJwk,
    thumbprint: computeDpopJwkThumbprint(publicJwk),
  };
}

function buildDpopProof(input: ManagedRelayDpopProofInput, key: StoredMobileDpopKey): string {
  const normalizedUrl = new URL(input.url);
  normalizedUrl.search = "";
  normalizedUrl.hash = "";
  const jti = bytesToHex(randomBytes(16));
  const iat = Math.floor(Date.now() / 1000);
  const header = { typ: "dpop+jwt", alg: "ES256", jwk: key.publicJwk };
  const payload: Record<string, unknown> = {
    htm: input.method.toUpperCase(),
    htu: normalizedUrl.toString(),
    jti,
    iat,
  };
  if (input.accessToken) {
    payload.ath = computeDpopAccessTokenHash(input.accessToken);
  }
  const headerB64 = Encoding.encodeBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = Encoding.encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signingInputHash = sha256(new TextEncoder().encode(signingInput));
  const privateKeyBytes = hexToBytes(key.privateHex);
  const signature = p256.sign(signingInputHash, privateKeyBytes);
  const signatureB64 = base64UrlEncode(signature.toCompactRawBytes());
  return `${signingInput}.${signatureB64}`;
}

function createMobileDpopProof(
  input: ManagedRelayDpopProofInput,
  key: StoredMobileDpopKey,
): Effect.Effect<string, ManagedRelayDpopSignerError> {
  return Effect.try({
    try: () => buildDpopProof(input, key),
    catch: (cause) => new ManagedRelayDpopSignerError({ cause }),
  });
}

export const mobileDpopSignerLayer: Layer.Layer<
  ManagedRelayDpopSigner,
  ManagedRelayDpopSignerError
> = Layer.effect(
  ManagedRelayDpopSigner,
  Effect.gen(function* () {
    const existing = yield* Effect.tryPromise({
      try: () => readSecureJson<StoredMobileDpopKey>(DPOP_KEY_STORAGE_KEY),
      catch: (cause) => new ManagedRelayDpopSignerError({ cause }),
    });
    const key = existing ?? generateMobileDpopKey();
    if (!existing) {
      yield* Effect.tryPromise({
        try: () => writeSecureJson(DPOP_KEY_STORAGE_KEY, key),
        catch: (cause) => new ManagedRelayDpopSignerError({ cause }),
      });
    }
    return ManagedRelayDpopSigner.of({
      thumbprint: Effect.succeed(key.thumbprint),
      createProof: (input) => createMobileDpopProof(input, key),
    });
  }),
);
