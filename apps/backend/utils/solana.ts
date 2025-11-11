import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import bs58 from "bs58";

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const DEVNET_USDC_MINT =
  process.env.DEVNET_USDC_MINT ||
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/**
 * Creates a new Solana connection
 */
export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

/**
 * Generates a new Solana keypair
 */
export function generateWallet(): { publicKey: string; privateKey: string } {
  const keypair = Keypair.generate();

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
  };
}

/**
 * Gets the balance of a Solana wallet in SOL
 */
export async function getBalance(publicKey: string): Promise<number> {
  try {
    const connection = getConnection();
    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);

    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error getting balance:", error);
    throw new Error("Failed to get wallet balance");
  }
}

/**
 * Gets the USDC balance of a Solana wallet
 */
export async function getUSDCBalance(publicKey: string): Promise<number> {
  try {
    const connection = getConnection();
    const pubKey = new PublicKey(publicKey);
    const usdcMint = new PublicKey(DEVNET_USDC_MINT);

    // Get associated token account address
    const ata = await getAssociatedTokenAddress(usdcMint, pubKey);

    try {
      // Get token account info
      const account = await getAccount(connection, ata);
      // USDC has 6 decimals
      return Number(account.amount) / 1_000_000;
    } catch (error) {
      // Token account doesn't exist yet
      return 0;
    }
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return 0;
  }
}

/**
 * Gets a keypair from a private key string
 */
export function getKeypairFromPrivateKey(privateKey: string): Keypair {
  try {
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Error creating keypair from private key:", error);
    throw new Error("Invalid private key");
  }
}

/**
 * Formats a wallet address for display (first 8 + last 4 chars)
 */
export function formatAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

/**
 * Gets Solscan URL for an address
 */
export function getSolscanUrl(address: string): string {
  const network = process.env.SOLANA_NETWORK || "devnet";
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://solscan.io/address/${address}${cluster}`;
}
