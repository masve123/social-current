import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import type { ProviderId } from "@/lib/smm";

export type OrderTokenPayload = {
  version: 1;
  provider: ProviderId;
  providerOrder: string;
  serviceSlug: string;
  offerId: string;
  createdAt: number;
};

function secret() {
  const value = process.env.ORDER_TOKEN_SECRET;
  if (!value || value.length < 32) throw new Error("ORDER_TOKEN_SECRET must contain at least 32 characters.");
  return value;
}

export function assertOrderTokenReady() {
  secret();
}

function encryptionKey() {
  return createHash("sha256").update(secret()).digest();
}

export function createOrderToken(payload: Omit<OrderTokenPayload, "version" | "createdAt">) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from("SC1"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ ...payload, version: 1, createdAt: Date.now() }), "utf8"),
    cipher.final(),
  ]);
  return `SC1.${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function readOrderToken(token: string): OrderTokenPayload {
  const [prefix, encodedIv, encodedPayload, encodedTag] = token.split(".");
  if (prefix !== "SC1" || !encodedIv || !encodedPayload || !encodedTag) throw new Error("Enter a valid Social Current order number.");

  let payload: OrderTokenPayload;
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAAD(Buffer.from("SC1"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encodedPayload, "base64url")),
      decipher.final(),
    ]);
    payload = JSON.parse(decrypted.toString("utf8")) as OrderTokenPayload;
  } catch {
    throw new Error("Enter a valid Social Current order number.");
  }
  if (
    payload.version !== 1 ||
    !["followiz", "smmworld", "smmpwr"].includes(payload.provider) ||
    !payload.providerOrder ||
    !payload.serviceSlug ||
    !payload.offerId
  ) {
    throw new Error("Enter a valid Social Current order number.");
  }
  return payload;
}
