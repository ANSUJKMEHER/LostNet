import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * SERVER-ONLY. Never import this from a client component.
 *
 * The ownership challenge is stored as a PBKDF2-SHA256 hash with a random
 * per-item salt. The plaintext answer never reaches the database, the API
 * response, or the browser — the custody desk types what the claimant says
 * aloud and the comparison happens here, on the server.
 *
 * A slow KDF (120k iterations) is used rather than a bare SHA-256 because the
 * answer to "what colour is the tag?" is a short, low-entropy secret that a
 * plain hash would surrender to a dictionary attack in milliseconds.
 */
const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

/** Answers are compared case-insensitively and whitespace-normalised. */
export function normaliseAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

/** Human-readable one-time claim token, e.g. #LN-8492. Not a cryptographic secret. */
export function newClaimToken(): string {
  const n = randomBytes(2).readUInt16BE(0) % 9000;
  return `#LN-${1000 + n}`;
}

export function hashAnswer(answer: string, salt: string): string {
  return pbkdf2Sync(normaliseAnswer(answer), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
}

export function verifyAnswer(answer: string, salt: string, expectedHash: string): boolean {
  const computed = Buffer.from(hashAnswer(answer, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (computed.length === 0 || computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

/**
 * Strips every server-side secret before an item crosses to the client.
 * Applied by both providers on their public read paths so no route can leak
 * the salt or the hash by accident.
 */
export function stripItemSecrets<T extends { secretSalt?: string; secretAnswerHash?: string }>(
  item: T,
): T {
  const { secretSalt: _salt, secretAnswerHash: _hash, ...rest } = item;
  return rest as T;
}

/** The question is only meaningful next to a token — keep it out of public listings. */
export function stripReunionSecrets<T extends { challengeQuestion?: string }>(reunion: T): T {
  const { challengeQuestion: _q, ...rest } = reunion;
  return rest as T;
}
