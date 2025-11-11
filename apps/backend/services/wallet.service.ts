import { prismaClient as prisma } from "db/client";
import { generateWallet, getBalance, getUSDCBalance } from "../utils/solana.js";
import { encryptPrivateKey, decryptPrivateKey } from "../utils/crypto.js";

const SECRET_KEY = process.env.SECRET_KEY || "";

if (!SECRET_KEY) {
  throw new Error("SECRET_KEY environment variable is required");
}

/**
 * Creates a new wallet for a user
 */
export async function createWallet(telegramId: string, username?: string) {
  try {
    // Check if user already has a wallet
    const existingUser = await prisma.user.findUnique({
      where: { telegramId },
      include: { wallet: true },
    });

    if (existingUser?.wallet) {
      return {
        isNew: false,
        publicKey: existingUser.wallet.publicKey,
        balance: existingUser.wallet.balance,
      };
    }

    // Generate new Solana wallet
    const { publicKey, privateKey } = generateWallet();

    // Encrypt private key
    const encryptedPrivateKey = encryptPrivateKey(privateKey, SECRET_KEY);

    // Create or update user and wallet
    const user =
      existingUser ||
      (await prisma.user.create({
        data: {
          telegramId,
          username,
        },
      }));

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        publicKey,
        encryptedPrivateKey,
        balance: 0,
      },
    });

    return {
      isNew: true,
      publicKey: wallet.publicKey,
      balance: 0,
    };
  } catch (error) {
    console.error("Error creating wallet:", error);
    throw error;
  }
}

/**
 * Gets a user's wallet
 */
export async function getUserWallet(telegramId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: { wallet: true },
    });

    return user?.wallet || null;
  } catch (error) {
    console.error("Error getting user wallet:", error);
    throw error;
  }
}

/**
 * Updates wallet balance from blockchain
 */
export async function updateWalletBalance(publicKey: string): Promise<number> {
  try {
    const balance = await getBalance(publicKey);

    await prisma.wallet.update({
      where: { publicKey },
      data: { balance },
    });

    return balance;
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    throw error;
  }
}

/**
 * Gets USDC balance for a wallet
 */
export async function getWalletUSDCBalance(publicKey: string): Promise<number> {
  try {
    const usdcBalance = await getUSDCBalance(publicKey);
    return usdcBalance;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return 0;
  }
}

/**
 * Gets user by telegram ID, creates if doesn't exist
 */
export async function getOrCreateUser(telegramId: string, username?: string) {
  try {
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username,
        },
      });
    }

    return user;
  } catch (error) {
    console.error("Error getting or creating user:", error);
    throw error;
  }
}
