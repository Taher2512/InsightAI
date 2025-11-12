import { prismaClient as prisma } from "db/client";
import { generateWallet, getBalance, getUSDCBalance } from "../utils/solana.js";
import { encryptPrivateKey, decryptPrivateKey } from "../utils/crypto.js";

const SECRET_KEY = process.env.SECRET_KEY || "";

if (!SECRET_KEY) {
  throw new Error("SECRET_KEY environment variable is required");
}

export async function createWallet(telegramId: string, username?: string) {
  try {
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

    const { publicKey, privateKey } = generateWallet();

    const encryptedPrivateKey = encryptPrivateKey(privateKey, SECRET_KEY);

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

export async function getWalletUSDCBalance(publicKey: string): Promise<number> {
  try {
    const usdcBalance = await getUSDCBalance(publicKey);
    return usdcBalance;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return 0;
  }
}

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
