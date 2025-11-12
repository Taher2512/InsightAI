import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

export function encryptPrivateKey(
  privateKey: string,
  secretKey: string
): string {
  try {
    const key = crypto.createHash("sha256").update(secretKey).digest();

    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(privateKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Error encrypting private key:", error);
    throw new Error("Failed to encrypt private key");
  }
}

export function decryptPrivateKey(
  encryptedData: string,
  secretKey: string
): string {
  try {
    const key = crypto.createHash("sha256").update(secretKey).digest();

    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0]!, "hex");
    const encrypted = parts[1]!;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted: string = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Error decrypting private key:", error);
    throw new Error("Failed to decrypt private key");
  }
}
