# Getting Devnet USDC Tokens

The official devnet USDC mint is: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

## Problem

Public USDC faucets for Solana devnet are often unreliable or don't exist. Here are your options:

---

## Option 1: Create Your Own Test USDC Mint ⭐ RECOMMENDED

Since devnet USDC faucets don't work, create a custom USDC-like token for testing:

```bash
# Run the minting script
bun run scripts/mint-devnet-usdc.ts <your-wallet-address> 100

# Example:
bun run scripts/mint-devnet-usdc.ts 7xJ8KgXQ9Y4Bp2qKVXNr8L4p3FwZ5nQzN3cGh1KqYxdR 100
```

**What it does:**

- Creates a new SPL token with 6 decimals (like USDC)
- Mints 100 tokens to your wallet
- Gives you a custom mint address to use in testing

**Update your code:**

```typescript
// Instead of using official USDC mint
const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// Use your custom mint
const USDC_MINT = "<your-custom-mint-from-script>";
```

---

## Option 2: Circle Developer Support

Circle (the creator of USDC) may provide devnet tokens:

1. **Email**: developer-support@circle.com
2. **Subject**: "Request for Devnet USDC Tokens"
3. **Include**:
   - Your wallet address
   - Amount needed (e.g., 100 USDC)
   - Purpose (hackathon/testing)

**Response time**: 1-3 business days

---

## Option 3: Corbits/Faremeter Community

Since you're using Corbits for x402:

1. **Find Corbits Discord/Community**:
   - Check: https://docs.corbits.dev (look for community links)
   - GitHub discussions: https://github.com/faremeter

2. **Request Devnet USDC**:
   - Explain you're building for their hackathon track
   - Provide your wallet address
   - They may have a private faucet

---

## Option 4: Fund from Another Wallet

If you have access to another wallet with devnet USDC:

```bash
# Install Solana CLI if not already installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Transfer devnet USDC
spl-token transfer \
  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  100 \
  <recipient-wallet-address> \
  --url devnet \
  --fund-recipient
```

---

## Option 5: Manual Token Account + Mint Script

Create token account and mint manually:

```typescript
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const connection = new Connection(clusterApiUrl("devnet"));
const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// You need to be the mint authority (you're not, so this won't work)
// This is why custom mints are recommended for testing
```

---

## Option 6: Mock USDC for Development

For initial development/testing without real tokens:

```typescript
// In your wallet service
export async function getUSDCBalance(publicKey: string): Promise<number> {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.MOCK_USDC === "true"
  ) {
    // Return mock balance for testing
    return 1000;
  }

  // Real implementation
  const connection = new Connection(process.env.SOLANA_RPC || "");
  // ... actual balance check
}
```

Add to `.env`:

```bash
NODE_ENV=development
MOCK_USDC=true  # Remove when you have real devnet USDC
```

---

## Comparison Table

| Method               | Time       | Real USDC | Works with Corbits | Difficulty                |
| -------------------- | ---------- | --------- | ------------------ | ------------------------- |
| Custom Mint          | 2 min      | No        | Maybe\*            | Easy                      |
| Circle Support       | 1-3 days   | Yes       | Yes                | Easy                      |
| Corbits Community    | Hours-Days | Yes       | Yes                | Medium                    |
| Transfer from Wallet | Instant    | Yes       | Yes                | Easy (if you have access) |
| Mock for Dev         | 1 min      | No        | No                 | Very Easy                 |

\*Custom mint may not work with Corbits facilitator if it validates the mint address

---

## Recommended Approach

### For Hackathon Development:

1. **Start with Custom Mint** (Option 1)

   ```bash
   bun run scripts/mint-devnet-usdc.ts <wallet> 100
   ```

2. **Test Your Integration**
   - Verify Corbits middleware accepts custom mint
   - Test payment flow end-to-end

3. **If Corbits Requires Official USDC**:
   - Request from Circle (Option 2)
   - Ask Corbits community (Option 3)
   - Use mock mode temporarily (Option 6)

---

## Checking Your Balance

After receiving tokens (any method):

```bash
# Check USDC balance
spl-token balance 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url devnet

# Or custom mint
spl-token balance <your-custom-mint> --url devnet

# List all token accounts
spl-token accounts --url devnet
```

---

## Testing Your Bot

Once you have USDC (custom or official):

```bash
# 1. Update .env with mint address
echo "DEVNET_USDC_MINT=<your-mint-address>" >> .env

# 2. Start your bot
bun run apps/backend/index.ts

# 3. Test in Telegram
/start
/wallet
/balance  # Should show USDC balance
/track <whale-address>
# Click "Get AI Analysis" button
# Corbits should handle payment
```

---

## Need Help?

If none of these work:

1. **Open GitHub Issue**: In your project or Corbits repo
2. **Hackathon Discord**: Ask organizers for devnet USDC
3. **Use Mainnet**: If deadline is close, test on mainnet with small real USDC (not recommended)

---

**Bottom Line**: For hackathon demo, Option 1 (custom mint) is fastest. For production-ready code, get official devnet USDC from Circle or Corbits community.
