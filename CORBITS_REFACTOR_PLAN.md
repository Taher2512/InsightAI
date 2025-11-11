# Corbits x402 Refactoring Plan

## Overview

Refactoring from manual SOL-based x402 implementation to official **Corbits (Faremeter) SDK** with **USDC micropayments** on **Solana devnet**.

**Hackathon Track**: _Create AI Agents or services that autonomously pay for APIs, LLM tokens, or data via Solana USDC + HTTP-402 micropayments_

---

## ✅ Confirmed: Corbits Supports Devnet

### Discovery

Examined `@faremeter/info` package source code:

```typescript
// node_modules/@faremeter/info/dist/src/solana.d.ts
knownClusters: ["devnet", "testnet", "mainnet-beta"]

USDC: {
  cluster: {
    "mainnet-beta": { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
    devnet: { address: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" }
  }
}
```

**Devnet USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

---

## Corbits SDK Packages (Installed ✅)

```bash
bun add @faremeter/middleware @faremeter/info @faremeter/fetch @faremeter/payment-solana
```

| Package                     | Version | Purpose                                |
| --------------------------- | ------- | -------------------------------------- |
| `@faremeter/middleware`     | 0.11.1  | Server-side x402 paywall middleware    |
| `@faremeter/info`           | 0.11.1  | Network/token lookups (USDC addresses) |
| `@faremeter/fetch`          | 0.11.1  | Client-side HTTP-402 payment handler   |
| `@faremeter/payment-solana` | 0.11.1  | Solana transaction creation            |

---

## Architecture Changes

### Before (Manual Implementation)

```
┌─────────────┐         ┌──────────────┐
│ AI Agent    │ ──SOL──>│ x402 Server  │
│             │<──Data──│              │
└─────────────┘         └──────────────┘
                             │
                             ▼
                    Manual Transaction
                    Verification Logic
```

### After (Corbits Implementation)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│ AI Agent    │ ─USDC──>│ x402 Server  │<───────>│ Corbits         │
│ @faremeter  │<──Data──│ @faremeter   │  402    │ Facilitator     │
│   /fetch    │         │  /middleware │         │ (Paid/Verified) │
└─────────────┘         └──────────────┘         └─────────────────┘
```

**Benefits**:

- ✅ Proper HTTP-402 protocol compliance
- ✅ Automatic payment verification via facilitator
- ✅ USDC stablecoin (no volatility)
- ✅ Hackathon track requirements met
- ✅ Industry-standard implementation

---

## Refactoring Checklist

### Phase 1: x402 Server Refactoring ✅ DONE

**File**: `apps/backend/x402-server-new.ts` (created)

**Changes**:

- [x] Import `@faremeter/middleware` and `@faremeter/info`
- [x] Remove manual transaction verification code
- [x] Remove `return402()` helper function
- [x] Implement Corbits middleware for all 3 endpoints:
  - `/api/x402/historical-patterns` → 0.5 USDC
  - `/api/x402/sentiment-analysis` → 0.3 USDC
  - `/api/x402/market-impact` → 0.4 USDC (includes Switchboard oracle)
- [x] Configure devnet network
- [x] Use `lookupKnownSPLToken('devnet', 'USDC')` for mint address

**Middleware Pattern**:

```typescript
const middleware = await faremeter.createMiddleware({
  facilitatorURL: "https://facilitator.corbits.dev",
  accepts: [
    {
      ...solana.x402Exact({
        network: "devnet",
        asset: "USDC",
        amount: 500000, // 0.5 USDC (6 decimals)
        payTo: RECIPIENT_WALLET,
      }),
      resource: `http://localhost:${PORT}/api/x402/historical-patterns`,
      description: "Historical whale behavior patterns",
    },
  ],
});

app.get("/api/x402/historical-patterns", middleware, handler);
```

**Price Conversion** (SOL → USDC):
| Endpoint | Old (SOL) | New (USDC) | Rationale |
|----------|-----------|------------|-----------|
| historical-patterns | 0.05 SOL | 0.5 USDC | $8.40 → $0.50 (more reasonable) |
| sentiment-analysis | 0.03 SOL | 0.3 USDC | $5.04 → $0.30 |
| market-impact | 0.04 SOL | 0.4 USDC | $6.72 → $0.40 |

_(Assuming SOL ~$168 from Switchboard oracle)_

---

### Phase 2: AI Agent Payment Logic 🔧 IN PROGRESS

**File**: `apps/backend/services/agent.service.ts`

**Current State**: Uses manual transaction creation

```typescript
// OLD CODE (lines ~280-310)
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: userPubkey,
    toPubkey: recipientPubkey,
    lamports: Math.round(costInSOL * LAMPORTS_PER_SOL),
  })
);
```

**Target State**: Use `@faremeter/fetch`

```typescript
import { wrap } from "@faremeter/fetch";
import { createPaymentHandler } from "@faremeter/payment-solana/exact";
import { Connection } from "@solana/web3.js";
import { solana } from "@faremeter/info";

// In class constructor
const connection = new Connection(process.env.SOLANA_RPC || "");
const usdcMint = solana.USDC.cluster.devnet.address; // 4zMMC9srt...
const paymentHandler = createPaymentHandler(userWallet, usdcMint, connection);
const fetchWithPayer = wrap(fetch, { handlers: [paymentHandler] });

// In purchaseAPI() method
const response = await fetchWithPayer(apiUrl, {
  method: "GET",
  // Corbits automatically handles 402 response and payment
});

if (response.ok) {
  const data = await response.json();
  // Payment successful, data retrieved
}
```

**Database Updates**:

```typescript
// X402Payment table - update amount from SOL to USDC
await prisma.x402Payment.create({
  data: {
    userId: user.id,
    endpoint: apiUrl,
    amount: 0.5, // USDC instead of SOL
    currency: "USDC", // NEW FIELD
    signature: paymentTx,
    status: "completed",
    switchboardPrice: oraclePrice.price,
    // ... rest
  },
});
```

---

### Phase 3: Wallet Service USDC Support 🔧 TODO

**File**: `apps/backend/services/wallet.service.ts`

**Requirements**:

1. Create USDC associated token account when wallet is created
2. Check USDC balance in addition to SOL balance
3. Fund user wallets with devnet USDC for testing
4. Keep SOL for transaction fees (rent, gas)

**Implementation**:

```typescript
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { solana } from "@faremeter/info";

export async function createWallet(telegramId: string) {
  // ... existing SOL wallet creation ...

  // Create USDC token account
  const usdcMint = new PublicKey(solana.USDC.cluster.devnet.address);
  const ata = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);

  const createAtaIx = createAssociatedTokenAccountInstruction(
    keypair.publicKey, // payer
    ata,
    keypair.publicKey, // owner
    usdcMint
  );

  // Send transaction to create ATA
  // ...

  return {
    publicKey: keypair.publicKey.toBase58(),
    usdcTokenAccount: ata.toBase58(), // NEW
  };
}

export async function getUSDCBalance(publicKey: string): Promise<number> {
  const usdcMint = new PublicKey(solana.USDC.cluster.devnet.address);
  const ata = await getAssociatedTokenAddress(
    usdcMint,
    new PublicKey(publicKey)
  );

  try {
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 1_000_000; // 6 decimals
  } catch {
    return 0; // ATA doesn't exist yet
  }
}
```

**Database Schema Update**:

```prisma
model Wallet {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  publicKey       String   @unique
  usdcTokenAccount String? // NEW: Associated token account
  encryptedPrivateKey String
  balance         Float    @default(0) // SOL balance
  usdcBalance     Float    @default(0) // NEW: USDC balance
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id])
}
```

---

### Phase 4: Database Schema Updates 🔧 TODO

**File**: `packages/db/prisma/schema.prisma`

**Changes Needed**:

```prisma
model X402Payment {
  id        Int      @id @default(autoincrement())
  userId    Int
  endpoint  String
  amount    Float    // Change: Now represents USDC not SOL
  currency  String   @default("USDC") // NEW: "USDC" or "SOL"
  signature String   @unique
  status    String
  metadata  Json?

  // Phase 3: Switchboard oracle data
  switchboardPrice      Float?
  switchboardConfidence Float?
  priceTimestamp        DateTime?

  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model Analysis {
  id         Int      @id @default(autoincrement())
  userId     Int
  alertId    Int
  cost       Float    // Change: Now USDC not SOL
  currency   String   @default("USDC") // NEW
  report     Json
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
  alert      WhaleAlert @relation(fields: [alertId], references: [id])
}

// NEW MODEL: Track conversion rates
model ConversionRate {
  id            Int      @id @default(autoincrement())
  fromCurrency  String   // "SOL"
  toCurrency    String   // "USDC"
  rate          Float    // e.g., 168.50
  source        String   // "Switchboard"
  timestamp     DateTime @default(now())

  @@index([fromCurrency, toCurrency, timestamp])
}
```

**Migration Command**:

```bash
cd packages/db
bunx prisma migrate dev --name add_usdc_support
```

---

### Phase 5: User-Facing Message Updates 🔧 TODO

**File**: `apps/backend/index.ts`

**Commands to Update**:

#### `/start` Command

```typescript
// BEFORE
"Get AI-powered whale analysis (costs ~0.12 SOL)";

// AFTER
"Get AI-powered whale analysis (costs ~1.2 USDC / $1.20)";
```

#### `/wallet` Command

```typescript
// AFTER
const message = `
👛 *Your New Wallet Created!*

**SOL Address**: \`${publicKey}\`
**USDC Token Account**: \`${usdcTokenAccount}\`

**Balances**:
- SOL: ${solBalance.toFixed(4)} SOL (for transaction fees)
- USDC: ${usdcBalance.toFixed(2)} USDC (for AI analysis)

**How to Fund (Devnet)**:
1. Get devnet SOL: https://faucet.solana.com (0.1 SOL minimum)
2. Get devnet USDC: Use SPL Token Faucet or ask in Discord

💡 You need USDC to pay for AI analysis, and SOL for transaction fees.
`;
```

#### `/balance` Command

```typescript
// AFTER
const message = `
*Balance* 💰

**SOL Balance**: ${solBalance.toFixed(4)} SOL
**USDC Balance**: ${usdcBalance.toFixed(2)} USDC ($${usdcBalance.toFixed(2)})

${
  usdcBalance < MINIMUM_ANALYSIS_COST_USDC
    ? `⚠️ You need at least ${MINIMUM_ANALYSIS_COST_USDC} USDC to request AI analysis.`
    : `✅ You have sufficient USDC for AI analysis!`
}

${
  solBalance < 0.01
    ? `⚠️ Low SOL balance. Get some for transaction fees.`
    : `✅ Sufficient SOL for transaction fees.`
}
`;
```

#### `/deposit` Command

```typescript
// AFTER
const message = `
*Deposit Instructions* 💰

**Your Wallet**: \`${publicKey}\`
**USDC Token Account**: \`${usdcTokenAccount}\`

**For AI Analysis (Required)**:
- Send devnet USDC to your token account
- Minimum: 1.5 USDC (1 analysis)
- Get from: SPL Token Faucet or Corbits Discord

**For Transaction Fees**:
- Send devnet SOL to your wallet address  
- Minimum: 0.05 SOL
- Get from: https://faucet.solana.com

**Devnet USDC Mint**: 
\`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU\`

🔗 [View Wallet on Solscan](${solscanUrl})
`;
```

#### `/help` Command

```typescript
// AFTER
const helpText = `
*Available Commands:*

🏠 /start - Start the bot
👛 /wallet - View/create your Solana wallet (SOL + USDC)
💰 /balance - Check SOL and USDC balances
📥 /deposit - Get funding instructions (devnet USDC + SOL)
🐋 /track <address> - Track whale wallet (requires USDC)
🔔 /alerts - View your active whale alerts
📊 /oracle - View Switchboard oracle prices (SOL/ETH/BTC)
❓ /help - Show this message

*How It Works:*
1. Create wallet (/wallet)
2. Fund with devnet USDC + SOL (/deposit)
3. Track whale addresses (/track)
4. Receive alerts when whales move funds
5. Request AI analysis (costs ~1.2 USDC via Corbits x402)

*Technology Stack:*
- Solana devnet blockchain
- Switchboard oracle (price verification)
- Google Gemini AI (whale analysis)
- Corbits x402 protocol (USDC micropayments)

*Hackathon Project:*
This bot demonstrates autonomous AI agents paying for premium APIs using 
Solana USDC + HTTP-402 micropayments via the Corbits protocol.
`;
```

---

### Phase 6: Integration & Testing 🔧 TODO

**Steps**:

1. **Replace Old Server**:

   ```bash
   mv apps/backend/x402-server.ts apps/backend/x402-server-old.ts
   mv apps/backend/x402-server-new.ts apps/backend/x402-server.ts
   ```

2. **Update Main Entry Point** (`apps/backend/index.ts`):

   ```typescript
   import { startX402Server } from "./x402-server.js";

   // Start both bot and x402 server
   bot.launch();
   startX402Server();
   ```

3. **Set Environment Variables** (`.env`):

   ```bash
   # Existing
   DATABASE_URL="postgresql://..."
   TELEGRAM_BOT_TOKEN="..."
   SOLANA_RPC="https://api.devnet.solana.com"
   GEMINI_API_KEY="..."

   # NEW: For Corbits x402
   X402_API_PORT=3001
   X402_RECIPIENT_WALLET="<your-recipient-pubkey>"
   ```

4. **Test Devnet USDC Funding**:

   ```bash
   # Get devnet USDC from SPL Token Faucet
   # Or use Corbits Discord for testnet USDC

   # Check balance
   spl-token balance --owner <wallet-pubkey> 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url devnet
   ```

5. **Test x402 Payment Flow**:

   ```bash
   # Terminal 1: Start bot + x402 server
   bun run apps/backend/index.ts

   # Terminal 2: Test Corbits payment (requires USDC-funded wallet)
   curl http://localhost:3001/api/x402/historical-patterns?address=test
   # Expected: 402 Payment Required with Corbits payment instructions

   # Use @faremeter/fetch client to actually pay and retrieve data
   ```

6. **End-to-End Test**:
   - User: `/start`
   - User: `/wallet` → Get USDC token account
   - Admin: Fund wallet with devnet USDC (1.5 USDC) and SOL (0.05 SOL)
   - User: `/balance` → Verify USDC balance
   - User: `/track <whale-address>`
   - Bot: Sends mock whale alert
   - User: Click "🤖 Get AI Analysis"
   - Agent: Uses `@faremeter/fetch` to purchase APIs with USDC
   - Bot: Shows analysis report with oracle data
   - Verify: Database has X402Payment records in USDC

---

## Switchboard Oracle Integration (Preserved) ✅

**Critical**: Keep Phase 3 Switchboard functionality while switching to USDC!

**Files**:

- `services/switchboard.service.ts` (no changes needed)
- `services/agent.service.ts` (update currency only)
- `x402-server-new.ts` (already includes oracle in market-impact endpoint)

**Oracle Data Flow**:

```
Whale Alert → Agent.gatherContext() → Switchboard.getSolPrice()
                                    ↓
                            Calculate USD Impact
                            Determine Priority
                                    ↓
              Agent.decideAPIsToCall() → Use oracle for cost-benefit
                                    ↓
              Agent.purchaseAPI() → Pay with USDC via Corbits
                                    ↓
              Save oracle price with payment record
```

**No Changes Needed** (already working):

- `/oracle` command (shows SOL/ETH/BTC prices)
- `PriceSnapshot` database model
- Oracle confidence/staleness validation
- Volatility calculations

---

## Pricing Philosophy

### Old (SOL-based)

- Highly volatile (~$120-$200/SOL)
- 0.05 SOL = $6-$10 (fluctuates)
- Confusing for users
- Not ideal for micropayments

### New (USDC-based)

- Stablecoin (~$1.00/USDC)
- 0.5 USDC = $0.50 (predictable)
- Clear pricing for users
- Perfect for micropayments

### Recommended Pricing

| API Endpoint        | USDC Cost    | Justification                 |
| ------------------- | ------------ | ----------------------------- |
| historical-patterns | 0.5 USDC     | Most valuable (trade history) |
| sentiment-analysis  | 0.3 USDC     | Medium value (social data)    |
| market-impact       | 0.4 USDC     | High value (+ oracle data)    |
| **Total Analysis**  | **1.2 USDC** | ~$1.20 per whale analysis     |

---

## Testing Strategy

### Unit Tests

```typescript
// services/agent.service.test.ts
describe("Corbits Payment Integration", () => {
  it("should purchase API with USDC via Corbits", async () => {
    // Mock @faremeter/fetch
    // Verify payment handler called
    // Verify USDC amount correct
  });

  it("should record oracle price with USDC payment", async () => {
    // Verify X402Payment has switchboardPrice
    // Verify currency is "USDC"
  });
});

// services/wallet.service.test.ts
describe("USDC Wallet Support", () => {
  it("should create USDC associated token account", async () => {
    // Verify ATA created
    // Verify devnet USDC mint used
  });

  it("should check USDC balance correctly", async () => {
    // Mock SPL token account
    // Verify balance conversion (6 decimals)
  });
});
```

### Integration Tests

```typescript
describe("End-to-End Whale Analysis", () => {
  it("should complete full flow with USDC payments", async () => {
    // 1. Create wallet with USDC support
    // 2. Fund with devnet USDC
    // 3. Trigger whale alert
    // 4. Request AI analysis
    // 5. Verify Corbits payments made
    // 6. Verify oracle data included
    // 7. Verify report generated
  });
});
```

### Manual Tests (Devnet)

1. **Wallet Creation**: Verify USDC ATA created
2. **USDC Funding**: Transfer devnet USDC, check balance
3. **x402 Payment**: Trigger 402 response, verify facilitator interaction
4. **AI Analysis**: Full whale analysis with Corbits payments
5. **Oracle Integration**: Verify Switchboard data in reports
6. **Error Handling**: Test insufficient USDC, failed payments

---

## Rollout Plan

### Development Phase (Current)

- [x] Install Corbits packages
- [x] Create new x402 server with Corbits middleware
- [x] Verify devnet USDC support
- [ ] Update agent payment logic
- [ ] Add USDC wallet support
- [ ] Update database schema
- [ ] Update user messages

### Testing Phase

- [ ] Unit tests for new payment logic
- [ ] Integration tests with devnet USDC
- [ ] Manual testing with real Telegram bot
- [ ] Verify Switchboard oracle still works

### Deployment Phase

- [ ] Update production environment variables
- [ ] Deploy new x402 server
- [ ] Deploy updated bot
- [ ] Monitor logs for payment errors
- [ ] Gather user feedback

### Documentation Phase

- [ ] Update README with USDC instructions
- [ ] Create user guide for devnet USDC funding
- [ ] Document Corbits integration for hackathon submission
- [ ] Create architecture diagram

---

## Success Criteria

✅ **Hackathon Compliance**:

- Uses Corbits official x402 SDK
- USDC micropayments on Solana
- Autonomous AI agent paying for APIs
- Proper HTTP-402 protocol implementation

✅ **Technical Requirements**:

- All TypeScript errors resolved
- Database migrations successful
- Tests passing
- No runtime errors

✅ **User Experience**:

- Clear USDC funding instructions
- Transparent pricing (1.2 USDC per analysis)
- Error messages explain USDC balance issues
- Switchboard oracle data visible in reports

✅ **Code Quality**:

- Remove all manual transaction verification code
- Use official Corbits SDK patterns
- Proper error handling
- Clean architecture

---

## Resources

- **Corbits Docs**: https://docs.corbits.dev
- **Quickstart**: https://docs.corbits.dev/quickstart
- **Host Guide**: https://docs.corbits.dev/host-with-corbits/quickstart
- **GitHub**: https://github.com/faremeter
- **Discord**: Join Corbits community for devnet USDC
- **Devnet USDC Mint**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

---

## Next Steps

1. **Immediate**: Update `agent.service.ts` to use `@faremeter/fetch`
2. **Next**: Add USDC support to `wallet.service.ts`
3. **Then**: Update database schema with migrations
4. **Finally**: Update all Telegram bot messages for USDC

**Estimated Time**: 3-4 hours for full refactoring

---

**Status**: Phase 1 Complete ✅ | Phase 2-6 In Progress 🔧
