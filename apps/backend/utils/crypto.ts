import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encrypts a private key using AES-256-CBC
 */
export function encryptPrivateKey(
  privateKey: string,
  secretKey: string
): string {
  try {
    // Ensure secret key is 32 bytes for AES-256
    const key = crypto.createHash("sha256").update(secretKey).digest();

    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt private key
    let encrypted = cipher.update(privateKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Combine IV and encrypted data
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Error encrypting private key:", error);
    throw new Error("Failed to encrypt private key");
  }
}

/**
 * Decrypts a private key using AES-256-CBC
 */
export function decryptPrivateKey(
  encryptedData: string,
  secretKey: string
): string {
  try {
    // Ensure secret key is 32 bytes for AES-256
    const key = crypto.createHash("sha256").update(secretKey).digest();

    // Split IV and encrypted data
    const parts = encryptedData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0]!, "hex");
    const encrypted = parts[1]!;

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Decrypt private key
    let decrypted: string = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Error decrypting private key:", error);
    throw new Error("Failed to decrypt private key");
  }
}
