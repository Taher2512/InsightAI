#!/usr/bin/env bun
/**
 * Mint Devnet USDC Tokens
 *
 * Since public USDC faucets are unreliable, this script creates a USDC mint
 * on devnet and mints tokens to your wallet for testing.
 *
 * Usage:
 *   bun run scripts/mint-devnet-usdc.ts <your-wallet-address> <amount>
 *
 * Example:
 *   bun run scripts/mint-devnet-usdc.ts 7xJ8... 100
 */

import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

// Official devnet USDC mint (Circle/Solana)
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

async function mintDevnetUSDC() {
  // Parse command line arguments
  const recipientAddress = process.argv[2];
  const amount = parseFloat(process.argv[3] || "10");

  if (!recipientAddress) {
    console.error("❌ Error: Please provide a recipient wallet address");
    console.log("");
    console.log("Usage:");
    console.log(
      "  bun run scripts/mint-devnet-usdc.ts <wallet-address> <amount>"
    );
    console.log("");
    console.log("Example:");
    console.log("  bun run scripts/mint-devnet-usdc.ts 7xJ8KgXQ9Y... 100");
    process.exit(1);
  }

  console.log("🚀 Devnet USDC Token Minter\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("⚠️  IMPORTANT: Public USDC faucets are unreliable.");
  console.log("    This script creates a CUSTOM USDC-like token for testing.");
  console.log("    It will NOT work with the official USDC mint.");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  try {
    // Connect to devnet
    console.log("🌐 Connecting to Solana devnet...");
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // Create a new keypair for minting authority (you'll need devnet SOL)
    // In production, you'd load from env or secure storage
    console.log("🔑 Generating mint authority keypair...");
    const mintAuthority = Keypair.generate();

    console.log(`   Authority: ${mintAuthority.publicKey.toBase58()}`);
    console.log("");

    // Request airdrop for mint authority to pay for transactions
    console.log("💰 Requesting SOL airdrop for transaction fees...");
    const airdropSignature = await connection.requestAirdrop(
      mintAuthority.publicKey,
      2_000_000_000 // 2 SOL
    );

    await connection.confirmTransaction(airdropSignature);
    console.log("✅ Received 2 SOL for transaction fees");
    console.log("");

    // Create a new mint (6 decimals like real USDC)
    console.log("🪙 Creating custom USDC-like token mint...");
    const mint = await createMint(
      connection,
      mintAuthority,
      mintAuthority.publicKey, // mint authority
      null, // freeze authority (null = no freeze)
      6 // 6 decimals like USDC
    );

    console.log(`✅ Mint created: ${mint.toBase58()}`);
    console.log("");

    // Get or create associated token account for recipient
    console.log("📦 Creating/getting token account for recipient...");
    const recipientPubkey = new PublicKey(recipientAddress);

    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mint,
      recipientPubkey
    );

    console.log(`✅ Token account: ${tokenAccount.address.toBase58()}`);
    console.log("");

    // Mint tokens to recipient
    console.log(`💸 Minting ${amount} USDC to recipient...`);
    const amountInBaseUnits = amount * 1_000_000; // 6 decimals

    const mintSignature = await mintTo(
      connection,
      mintAuthority,
      mint,
      tokenAccount.address,
      mintAuthority.publicKey,
      amountInBaseUnits
    );

    console.log("✅ Tokens minted successfully!");
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("📊 Summary:");
    console.log(`   Mint Address: ${mint.toBase58()}`);
    console.log(`   Token Account: ${tokenAccount.address.toBase58()}`);
    console.log(`   Amount: ${amount} USDC`);
    console.log(`   Recipient: ${recipientAddress}`);
    console.log(`   Transaction: ${mintSignature}`);
    console.log("");
    console.log("🔗 View on Solana Explorer:");
    console.log(
      `   https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`
    );
    console.log("");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("⚠️  REMEMBER: This is a CUSTOM mint for testing!");
    console.log("    Update your .env with this mint address:");
    console.log(`    DEVNET_USDC_MINT=${mint.toBase58()}`);
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ Error:", error);
    console.error("");
    console.error("💡 Common issues:");
    console.error("   - Invalid wallet address");
    console.error("   - Not enough SOL for transaction fees");
    console.error("   - Devnet connection issues");
    process.exit(1);
  }
}

// Alternative: Request USDC from official sources
async function requestFromOfficialSources() {
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("🌐 Alternative Ways to Get Devnet USDC:");
  console.log("");
  console.log("1. Corbits Discord Community:");
  console.log("   - Join: https://discord.gg/corbits (if exists)");
  console.log("   - Ask for devnet USDC in #faucet channel");
  console.log("");
  console.log("2. Circle Developer Support:");
  console.log("   - Email: developer-support@circle.com");
  console.log("   - Request devnet USDC for testing");
  console.log("");
  console.log("3. SPL Token Faucet (if working):");
  console.log("   - Visit: https://spl-token-faucet.com");
  console.log("   - May not have official USDC mint");
  console.log("");
  console.log("4. Build Your Own (Custom Mint):");
  console.log("   - Run: bun run scripts/mint-devnet-usdc.ts <wallet> 100");
  console.log("   - Creates a USDC-like token for testing");
  console.log("");
  console.log("5. Transfer from Funded Wallet:");
  console.log("   - If you have another wallet with devnet USDC");
  console.log("   - Use spl-token transfer command");
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
}

// Run the script
if (process.argv[2] === "--help" || process.argv[2] === "-h") {
  requestFromOfficialSources();
} else {
  mintDevnetUSDC().then(() => {
    console.log("✅ Done!");
    process.exit(0);
  });
}
