import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { env } from "../config/env";

const IV_LENGTH = 12;

const resolveKey = (rawKey: string): Buffer => {
  if (/^[a-fA-F0-9]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  return createHash("sha256").update(rawKey).digest();
};

const key = resolveKey(env.ENCRYPTION_KEY);

export const encryptText = (value: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptText = (encryptedValue: string): string => {
  const [ivHex, authTagHex, payloadHex] = encryptedValue.split(":");

  if (!ivHex || !authTagHex || !payloadHex) {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

export const encryptJson = <T extends object>(value: T): string => encryptText(JSON.stringify(value));

export const decryptJson = <T>(encryptedValue: string): T => {
  const parsed = decryptText(encryptedValue);
  return JSON.parse(parsed) as T;
};
