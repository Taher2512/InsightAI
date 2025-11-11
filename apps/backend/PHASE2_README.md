# Phase 2: x402 Protocol + Google Gemini AI Agent

## 🎉 What's New in Phase 2

Phase 2 transforms the bot from a simple alert system into an **autonomous AI-powered whale analysis platform** using:

- **x402 Protocol**: Pay-per-use premium data APIs
- **Google Gemini AI**: Autonomous agent that makes economic decisions
- **Solana Devnet**: All payments happen on devnet (testnet funds)

---

## 🧠 How the AI Agent Works

### The agent is TRULY AUTONOMOUS:

1. **🔍 Gathers Free Context** - Uses Gemini to understand whale activity
2. **🤔 Makes Decisions** - Analyzes which premium APIs are worth buying
3. **💸 Pays Autonomously** - Creates Solana transactions without human intervention
4. **📊 Synthesizes Report** - Combines all data into comprehensive analysis
5. **💰 Transparent Costs** - Shows user exactly what was purchased and why

---

## 🔌 x402 API Endpoints

Three mock premium data endpoints are now available:

### 1. Historical Patterns (`0.05 SOL`)

- Past whale behavior & trade outcomes
- Success rate analysis
- Strategy patterns

### 2. Sentiment Analysis (`0.03 SOL`)

- Twitter, Reddit, forum sentiment
- Contrarian signals
- Social media trends

### 3. Market Impact (`0.04 SOL`)

- Liquidity analysis
- Order book depth
- Execution impact predictions

---

## 🚀 Setup Instructions

### 1. Install New Dependencies

```bash
cd apps/backend
bun install
# This installs: @google/genai, express, cors
```

### 2. Run Database Migrations

```bash
cd ../../packages/db
npx prisma generate
npx prisma migrate dev --name add_x402_payments
```

This adds the `X402Payment` model to track API purchases.

### 3. Update Environment Variables

Your `.env` should have:

```env
# Google Gemini AI
GOOGLE_GEMINI_API_KEY=AIzaSyBZIaJRRx9IRyO9J4rc-EaaWI0phDyNJ1c

# x402 Protocol
X402_RECIPIENT_WALLET=YOUR_DEVNET_WALLET_PUBLIC_KEY
X402_API_PORT=3001
AGENT_SERVICE_FEE=0.02
```

**Important:** Set `X402_RECIPIENT_WALLET` to a devnet wallet address where API payments will be sent.

### 4. Start the Bot

```bash
cd apps/backend
bun run index.ts
```

You should see:

```
🤖 Starting Solana Whale Tracker Bot...
✅ Database connected
🔌 x402 API server running on port 3001
💰 Recipient wallet: [your wallet]
🌐 Network: Solana Devnet

Available endpoints:
  GET /api/x402/historical-patterns (0.05 SOL)
  GET /api/x402/sentiment-analysis (0.03 SOL)
  GET /api/x402/market-impact (0.04 SOL)

🐋 Starting whale monitoring...
✅ Telegram Bot is running!
🤖 AI Agent ready for autonomous analysis
```

---

## 🧪 Testing the AI Agent

### Test Flow:

1. **Fund Your Wallet** (minimum 0.20 SOL for full testing):

   ```bash
   solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
   ```

2. **Wait for Whale Alert** (2-3 minutes)

3. **Click "Get AI Analysis" Button**

4. **Watch the Agent Work:**

   ```
   🤖 AI Agent Working...
   ⏳ Analyzing whale transaction...
   💭 Making autonomous decisions...
   ```

5. **Receive Complete Report** with:
   - Executive summary
   - Risk score & confidence
   - Recommendations
   - Trading signals
   - **Cost breakdown showing:**
     - Which APIs the agent chose to buy
     - Why it made those choices
     - How much each cost
     - Total spent

---

## 💡 Example Agent Behavior

### Scenario 1: Large Deposit (High Value)

```
🤖 Agent: Analyzing whale movement context...
🤖 Agent: Found context: SOL market showing strength
🤖 Agent: User balance: 0.25 SOL
🤖 Agent: Decision: Purchase ALL 3 APIs (0.12 SOL total)
🤖 Agent: Reasoning: Large deposit + bullish context = high value analysis needed
🤖 Agent: Paying 0.05 SOL for historical-patterns...
✅ Agent: Payment confirmed: [signature]
🤖 Agent: Paying 0.03 SOL for sentiment-analysis...
✅ Agent: Payment confirmed: [signature]
🤖 Agent: Paying 0.04 SOL for market-impact...
✅ Agent: Payment confirmed: [signature]
🤖 Agent: Synthesizing comprehensive report...
💰 Agent: Total spent: 0.12 SOL + 0.02 fee = 0.14 SOL
```

### Scenario 2: Small Withdrawal (Low Budget)

```
🤖 Agent: User balance: 0.08 SOL (limited budget)
🤖 Agent: Decision: Purchase only historical-patterns (0.05 SOL)
🤖 Agent: Reasoning: Small withdrawal, limited budget. Historical data sufficient.
🤖 Agent: Skipping sentiment & liquidity - not critical for this trade size
💰 Agent: Total spent: 0.05 SOL + 0.02 fee = 0.07 SOL
```

---

## 🔍 Verifying Payments

All payments happen on Solana **devnet**. Verify them:

1. **Check Transaction on Explorer:**

   ```
   https://explorer.solana.com/tx/[signature]?cluster=devnet
   ```

2. **View in Database** (Prisma Studio):

   ```bash
   cd packages/db
   bunx prisma studio
   ```

   Look at the `x402_payments` table to see:
   - Which APIs were purchased
   - Transaction signatures
   - Amounts paid
   - Metadata (agent reasoning)

3. **Check Recipient Wallet:**
   ```bash
   solana balance YOUR_RECIPIENT_WALLET --url devnet
   ```

---

## 📊 Database Schema Changes

### New Model: X402Payment

```prisma
model X402Payment {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   // "historical-patterns", etc.
  amount    Float    // Amount in SOL
  signature String   @unique // Solana tx signature
  status    String   // "pending", "verified", "failed"
  metadata  Json?    // Agent reasoning, API response
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 🔧 Architecture

```
┌─────────────────┐
│  Telegram Bot   │
└────────┬────────┘
         │
         ├─> "Get Analysis" Button Clicked
         │
         ▼
┌──────────────────────────┐
│  WhaleAnalysisAgent      │
│  (@google/genai)         │
└────────┬─────────────────┘
         │
         ├─> Phase 1: Gather Context (Gemini)
         │
         ├─> Phase 2: Decide APIs (Gemini)
         │   ├─> Analyze user balance
         │   ├─> Evaluate each API's value
         │   └─> Select optimal subset
         │
         ├─> Phase 3: Autonomous Payment
         │   ├─> For each selected API:
         │   │   ├─> Create Solana tx
         │   │   ├─> Sign with user wallet
         │   │   ├─> Submit to devnet
         │   │   └─> Call API with signature
         │   └─> Store in X402Payment table
         │
         └─> Phase 4: Synthesize Report
             ├─> Combine all data
             ├─> Generate insights (Gemini)
             └─> Return to user
```

---

## 🎯 Key Features

### 1. **True Autonomy**

- Agent decides which APIs to buy
- No hardcoded logic - uses AI reasoning
- Adapts to budget constraints
- Explains its decisions transparently

### 2. **x402 Protocol**

- HTTP 402 "Payment Required" status
- Solana transaction signatures as auth
- Verify payments on-chain before serving data
- Compatible with devnet/testnet

### 3. **Cost Transparency**

User sees:

- Which APIs were purchased
- Why agent chose them
- Individual costs
- Total charged
- Agent service fee

### 4. **Economic Reasoning**

Agent considers:

- Is this API worth the cost?
- Can user afford it?
- Will it improve analysis quality?
- Are there cheaper alternatives?

---

## 🐛 Troubleshooting

### Agent not working

```bash
# Check Gemini API key
echo $GOOGLE_GEMINI_API_KEY

# Test Gemini connection
curl -X POST \
  "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=$GOOGLE_GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

### x402 APIs not responding

```bash
# Check if server is running
curl http://localhost:3001/health

# Test 402 response
curl http://localhost:3001/api/x402/historical-patterns
# Should return: {"error": "Payment Required", ...}
```

### Payments not confirming

```bash
# Check devnet connection
solana cluster-version --url devnet

# Check wallet balance
solana balance YOUR_WALLET --url devnet

# View recent transactions
solana transaction-history YOUR_WALLET --url devnet
```

### Database errors

```bash
# Regenerate Prisma client
cd packages/db
npx prisma generate

# Check migrations
npx prisma migrate status

# View data
bunx prisma studio
```

---

## 📈 Agent Decision Examples

The agent's reasoning is logged and visible to users:

### Example 1: Bullish Whale Deposit

```
Agent Decision:
"Large 45,000 SOL deposit on Binance during bullish market conditions.
High-value transaction warrants comprehensive analysis. User has 0.30 SOL
balance which is sufficient. Purchasing all 3 APIs:
- Historical Patterns: Critical to see if this whale has successful track record
- Sentiment: Important to gauge if retail is aware and might FOMO
- Market Impact: Essential to predict price movement from this size deposit
Total cost 0.12 SOL is justified for high-conviction signal."
```

### Example 2: Small Withdrawal

```
Agent Decision:
"Moderate 8,000 SOL withdrawal. User balance is 0.09 SOL (limited budget).
Purchasing only Historical Patterns (0.05 SOL):
- Historical data will show if this whale typically sells before rallies
- Sentiment not critical - withdrawals are typically bearish regardless
- Liquidity analysis skipped - amount too small for major market impact
Cost optimization: 0.05 SOL + 0.02 fee = 0.07 SOL (leaves buffer)"
```

---

## 🎓 Learning Outcomes

By building this phase, you've implemented:

- ✅ x402 "Payment Required" HTTP protocol
- ✅ On-chain payment verification
- ✅ Autonomous AI agents with economic decision-making
- ✅ Google Gemini AI integration
- ✅ Solana devnet transactions
- ✅ Cost-based optimization
- ✅ Transparent AI reasoning
- ✅ Database tracking of API purchases

---

## 🚀 Phase 3 Ideas

Future enhancements could include:

- Real blockchain indexers (not mock alerts)
- Multiple AI models (GPT-4, Claude, etc.)
- Dynamic pricing based on demand
- Agent P&L tracking and optimization
- API marketplace with competition
- User-defined agent strategies
- Historical agent performance metrics

---

## 📝 Environment Variables Reference

| Variable                | Purpose            | Required | Example     |
| ----------------------- | ------------------ | -------- | ----------- |
| `GOOGLE_GEMINI_API_KEY` | Gemini AI access   | ✅       | `AIzaSy...` |
| `X402_RECIPIENT_WALLET` | Where payments go  | ✅       | `5tzFki...` |
| `X402_API_PORT`         | API server port    | ❌       | `3001`      |
| `AGENT_SERVICE_FEE`     | Agent's fee in SOL | ❌       | `0.02`      |

---

## 💰 Cost Structure

| Item                    | Cost         | Notes                          |
| ----------------------- | ------------ | ------------------------------ |
| Historical Patterns API | 0.05 SOL     | Past whale behavior            |
| Sentiment Analysis API  | 0.03 SOL     | Social media data              |
| Market Impact API       | 0.04 SOL     | Liquidity analysis             |
| **Agent Service Fee**   | **0.02 SOL** | **Autonomous decision-making** |
| **Max Total**           | **0.14 SOL** | **If all 3 APIs purchased**    |

---

**Built with ❤️ using Solana, Gemini AI, and x402 Protocol**
