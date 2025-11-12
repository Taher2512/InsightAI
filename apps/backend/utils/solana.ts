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

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

export function generateWallet(): { publicKey: string; privateKey: string } {
  const keypair = Keypair.generate();

  return {
    publicKey: keypair.publicKey.toBase58(),
    privateKey: bs58.encode(keypair.secretKey),
  };
}

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

export async function getUSDCBalance(publicKey: string): Promise<number> {
  try {
    const connection = getConnection();
    const pubKey = new PublicKey(publicKey);
    const usdcMint = new PublicKey(DEVNET_USDC_MINT);

    const ata = await getAssociatedTokenAddress(usdcMint, pubKey);

    try {
      const account = await getAccount(connection, ata);
      return Number(account.amount) / 1_000_000;
    } catch (error) {
      return 0;
    }
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return 0;
  }
}

export function getKeypairFromPrivateKey(privateKey: string): Keypair {
  try {
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Error creating keypair from private key:", error);
    throw new Error("Invalid private key");
  }
}

export function formatAddress(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

export function getSolscanUrl(address: string): string {
  const network = process.env.SOLANA_NETWORK || "devnet";
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `https://solscan.io/address/${address}${cluster}`;
}
