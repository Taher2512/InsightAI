# Corbits x402 Protocol Implementation

## Overview

Successfully replaced manual USDC transfer implementation with proper Corbits x402 payment protocol. The agent now uses industry-standard x402 HTTP 402 Payment Required responses with automatic payment handling.

## What Changed

### 1. Agent Service (`apps/backend/services/agent.service.ts`)

**Before:** Manual USDC transfers

- Used `getOrCreateAssociatedTokenAccount()` to get token accounts
- Used `transfer()` to manually send USDC
- Called API after payment confirmation
- Required manual transaction signing and confirmation

**After:** Corbits x402 Protocol

- Creates wallet interface with `signTransaction` and `updateTransaction` methods
- Uses `createPaymentHandler()` to create Corbits payment handler
- Wraps fetch with `wrapFetch()` for automatic x402 payment handling
- Corbits SDK automatically detects 402 responses and handles USDC payment
- No manual transfers needed - all payment logic handled by Corbits

**Key Code Changes:**

```typescript
// Create wallet interface for Corbits
const wallet = {
  network: network as any,
  publicKey: keypair.publicKey,
  signTransaction: async (tx: VersionedTransaction) => {
    tx.sign([keypair]);
    return tx;
  },
  updateTransaction: async (tx: VersionedTransaction) => {
    tx.sign([keypair]);
    return tx;
  },
};

// Create Corbits payment handler
const paymentHandler = createPaymentHandler(wallet, usdcMint, this.connection);

// Wrap fetch with x402 capability
const fetchWithPayer = wrapFetch(fetch, {
  handlers: [paymentHandler],
});

// Call API - Corbits handles 402 automatically
const response = await fetchWithPayer(url, { ... });
```

### 2. x402 Server Corbits (`apps/backend/x402-server-corbits.ts`)

**Updated pricing from SOL to USDC:**

- Historical Patterns: 0.5 USDC (was 0.05 SOL)
- Sentiment Analysis: 0.3 USDC (was 0.03 SOL)
- Market Impact: 0.4 USDC (was 0.04 SOL)

**USDC decimal handling:**

- USDC uses 6 decimals
- 0.5 USDC = 500,000 base units
- 0.3 USDC = 300,000 base units
- 0.4 USDC = 400,000 base units

### 3. Imports Updated

**Removed:**

```typescript
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
```

**Added:**

```typescript
import { VersionedTransaction } from "@solana/web3.js";
import { createPaymentHandler } from "@faremeter/payment-solana/exact";
import { wrap as wrapFetch } from "@faremeter/fetch";
import { lookupKnownSPLToken } from "@faremeter/info/solana";
```

## How It Works

### x402 Payment Flow

1. **Agent calls API endpoint** using wrapped fetch
2. **Server returns 402** Payment Required with payment details
3. **Corbits SDK automatically:**
   - Parses payment requirements
   - Creates USDC transfer transaction
   - Signs and submits transaction
   - Retries the original API request with proof of payment
4. **Server verifies payment** and returns data
5. **Agent receives data** without manual payment handling

### Benefits

✅ **Industry Standard:** Uses HTTP 402 status code (Payment Required)  
✅ **Automatic:** No manual payment logic needed in agent code  
✅ **Secure:** Payment verification handled by Corbits middleware  
✅ **Transparent:** Payment details in HTTP headers  
✅ **Hackathon Compliant:** Proper Corbits protocol implementation

## Testing Status

### Current Environment

- **Network:** Solana devnet
- **USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **User Balance:** 10 USDC on devnet
- **Server Mode:** Demo (localhost - Corbits middleware disabled)

### Demo Mode vs Production

**Demo Mode (Current):**

- Server runs on `localhost:3001`
- Corbits middleware disabled (facilitator can't reach localhost)
- API returns data without payment verification
- Used for development and testing

**Production Mode (Requires Public URL):**

- Deploy to Vercel/Railway/Render or use ngrok
- Enable Corbits middleware in `startX402Server()`
- Corbits facilitator can verify payments
- Full x402 protocol enforcement

### Test Commands

```bash
# Start the bot
bun run apps/backend/index.ts

# In Telegram:
/balance          # Check USDC balance (should show 10 USDC)
/track <address>  # Track a whale wallet
# Click "Get AI Analysis" button
# Watch logs for Corbits payment handling
/balance          # Verify USDC deducted (~1.2 USDC spent)
```

## Next Steps

### For Production Deployment

1. **Deploy x402 server to public URL**

   ```bash
   # Option 1: Vercel/Railway/Render
   # Option 2: ngrok for testing
   ngrok http 3001
   ```

2. **Update baseURL in x402-server.ts**

   ```typescript
   const baseURL = process.env.PUBLIC_URL || `https://your-app.vercel.app`;
   ```

3. **Enable Corbits middleware**

   ```typescript
   // In startX402Server()
   const middlewares = await createPaywallMiddlewares(); // Uncomment this
   app.use("/api/x402/historical-patterns", middlewares.historical);
   // ... other endpoints
   ```

4. **Test with real x402 enforcement**
   - Agent should see 402 responses
   - Corbits handles payment automatically
   - Server verifies payment via Corbits facilitator

### Optional: Switchboard Real Prices

Currently using simulated prices. To integrate Switchboard simulation server:

1. **Update `services/switchboard.service.ts`:**
   - Import `OracleJob` from `@switchboard-xyz/common`
   - Create job with CoinGecko/other sources
   - Use `Gateway.verifyFeed()` for real prices
   - Reference: https://docs.switchboard.xyz/product-documentation/data-feeds/solana-svm/part-1-designing-and-simulating-your-feed/option-2-designing-a-feed-in-typescript

## Architecture Diagram

```
┌─────────────┐
│   Telegram  │
│   User Bot  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│   Agent Service      │
│   (purchaseAPI)      │
│                      │
│   fetchWithPayer()   │ ← Wrapped with Corbits
│   (automatic x402)   │
└──────┬───────────────┘
       │
       │ 1. GET /api/x402/...
       ▼
┌──────────────────────┐
│   x402 Server        │
│   (Express + Cors)   │
│                      │
│   [Middleware]       │ ← Corbits (disabled in demo)
│   Returns 402        │
└──────┬───────────────┘
       │
       │ 2. 402 Payment Required
       ▼
┌──────────────────────┐
│   Corbits SDK        │
│   (Payment Handler)  │
│                      │
│   - Parse 402        │
│   - Create USDC tx   │
│   - Sign & submit    │
│   - Retry request    │
└──────┬───────────────┘
       │
       │ 3. Retry with proof
       ▼
┌──────────────────────┐
│   Corbits           │
│   Facilitator       │
│   (Production only) │
│                      │
│   Verify payment    │
└──────┬───────────────┘
       │
       │ 4. Payment verified
       ▼
┌──────────────────────┐
│   x402 Server        │
│   Returns data       │
└──────────────────────┘
```

## Payment Metadata

Payments are recorded in database with:

- `paymentMethod: "corbits-x402"`
- `protocol: "x402"`
- `currency: "USDC"`
- Transaction signature from Corbits (via headers)
- Switchboard oracle price data

## Dependencies

All Corbits packages installed (v0.11.1):

- ✅ `@faremeter/middleware` - Server-side x402 paywall
- ✅ `@faremeter/info` - Network/token lookups
- ✅ `@faremeter/fetch` - Client-side payment wrapper
- ✅ `@faremeter/payment-solana` - Solana transaction handler

## Conclusion

The agent now implements proper Corbits x402 protocol as requested. The implementation:

- Uses industry-standard HTTP 402 responses
- Handles payments automatically via wrapped fetch
- Follows Corbits quickstart documentation pattern
- Is ready for hackathon submission
- Works in demo mode for development
- Can be deployed to production with public URL

All compilation errors resolved. Ready for testing! 🚀
