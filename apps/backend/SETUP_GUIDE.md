# Solana Whale Tracker Telegram Bot - MVP

A Telegram bot that tracks Solana whale transactions and provides AI-powered analysis. This is Phase 1 MVP with mock whale monitoring and basic wallet management.

## 🎯 Features

- **Wallet Management**: Create and manage Solana devnet wallets
- **Whale Tracking**: Monitor 10 whale addresses with mock transaction alerts
- **Real-time Alerts**: Receive notifications when whales make large transactions
- **Balance Checking**: Check your wallet balance on Solana devnet
- **AI Analysis Request**: Request AI analysis for whale transactions (UI flow only in Phase 1)

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+ / Bun
- **Language**: TypeScript
- **Bot Framework**: Telegraf
- **Blockchain**: Solana Web3.js (Devnet)
- **Database**: PostgreSQL + Prisma ORM
- **Encryption**: Native Node.js crypto (AES-256-CBC)

## 📁 Project Structure

```
apps/backend/
├── index.ts                    # Main bot application
├── db/
│   └── index.ts               # Prisma client instance
├── services/
│   ├── wallet.service.ts      # Wallet creation and management
│   └── whale.service.ts       # Whale alert generation and tracking
├── utils/
│   ├── crypto.ts              # Private key encryption/decryption
│   └── solana.ts              # Solana blockchain utilities
├── .env                       # Environment variables
└── package.json
```

## 🚀 Setup Instructions

### Prerequisites

1. **Node.js 18+** or **Bun** installed
2. **PostgreSQL** database running
3. **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

### Step 1: Install Dependencies

```bash
cd apps/backend
bun install
# or
npm install
```

### Step 2: Configure Environment

Update `.env` file with your settings:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/insightai?schema=public

# Encryption Key (32 characters for AES-256)
SECRET_KEY=your-32-character-secret-key-here

# Solana Configuration (Devnet)
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet

# Bot Configuration
WHALE_ALERT_INTERVAL_MS=150000
MINIMUM_ANALYSIS_COST_SOL=0.15
```

### Step 3: Setup Database

```bash
# Generate Prisma client
cd ../../packages/db
bunx prisma generate

# Run migrations
bunx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
bunx prisma studio
```

### Step 4: Start the Bot

```bash
cd ../../apps/backend
bun run dev
# or
npm run dev
```

You should see:

```
🤖 Starting Solana Whale Tracker Bot...
✅ Database connected
🐋 Starting whale monitoring (interval: 150000ms)
✅ Bot is running!
```

## 📱 Using the Bot

### Available Commands

- `/start` - Welcome message and introduction
- `/wallet` - Create a new Solana wallet or view existing one
- `/balance` - Check your current SOL balance
- `/deposit` - Get deposit instructions with your wallet address
- `/track` - View the 10 tracked whale addresses
- `/alerts` - See recent whale transaction alerts
- `/help` - Display all available commands

### Testing Flow

1. **Start the bot**: Send `/start` to your bot in Telegram
2. **Create wallet**: Send `/wallet` to generate a new Solana devnet wallet
3. **Get devnet SOL**:

   ```bash
   solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
   ```

   Or use: https://faucet.solana.com

4. **Check balance**: Send `/balance` to verify funds arrived
5. **View tracked whales**: Send `/track` to see monitored addresses
6. **Wait for alerts**: Bot will send whale alerts every 2-3 minutes
7. **Request analysis**: Click "Get AI Analysis" button on any alert

## 🧪 Testing Checklist

- [ ] Bot responds to `/start` command
- [ ] `/wallet` creates new wallet and stores in database
- [ ] `/wallet` shows existing wallet on subsequent calls
- [ ] `/balance` fetches real balance from Solana devnet
- [ ] `/deposit` shows wallet address and instructions
- [ ] `/track` displays 10 whale addresses
- [ ] `/alerts` shows recent whale alerts from database
- [ ] Mock alerts generate every 2-3 minutes
- [ ] Alert messages include inline "Get AI Analysis" button
- [ ] Button click checks wallet balance correctly
- [ ] Insufficient balance shows error message
- [ ] Sufficient balance acknowledges analysis request
- [ ] Database persists users, wallets, alerts, and analyses

## 🗄️ Database Schema

### User

- Stores Telegram user information
- One-to-one relation with Wallet
- One-to-many relation with Analysis

### Wallet

- Stores encrypted Solana private keys
- Tracks public key and balance
- Belongs to User

### WhaleAlert

- Stores whale transaction alerts
- Tracks amount, token, action type, exchange
- One-to-many relation with Analysis

### Analysis

- Stores AI analysis requests
- Links WhaleAlert, User, and cost
- Report field for Phase 2 AI results

## 🔐 Security Notes

- Private keys are encrypted using AES-256-CBC
- Keys are never exposed in logs or responses
- Uses environment variable SECRET_KEY for encryption
- **This is DEVNET only - no real funds at risk**

## 🐛 Troubleshooting

### Bot not starting

```bash
# Check if PostgreSQL is running
pg_isready

# Check database connection
cd packages/db
bunx prisma studio
```

### Private key encryption errors

- Ensure SECRET_KEY is exactly 32 characters
- Check that .env file is loaded correctly

### Solana connection issues

- Verify SOLANA_RPC_URL is correct
- Test with: `curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1, "method":"getHealth"}'`

### No whale alerts

- Check console for error messages
- Verify WHALE_ALERT_INTERVAL_MS is set correctly
- Ensure at least one user exists in database

## 📊 Mock Data

**Tracked Whale Addresses** (10 addresses):

```
5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9
9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG
DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy
CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq
5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1
GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE
3vjSWBPuW5Zq8YxY2KVF4CKKs4kF8vGc8EKG3Q4LXYVk
BEhhFdFbeFnWzaEECvmNjk3YLXmEqAdhXPmLxfWsEXXx
A7HCQRKLjHwDQjhDCH8GVjPq5YPqz7eKK5c9LDKkpump
```

**Alert Generation**:

- Interval: Every 2-3 minutes (configurable)
- Amount: Random 1,000 - 50,000 SOL
- Action: Deposit or Withdrawal (50/50 split)
- Exchanges: Binance, Coinbase, Kraken, OKX, Bybit

## 🚧 Phase 2 Features (Not Implemented)

- Real blockchain indexing using Switchboard/Old Faithful
- Actual x402 payment processing
- AI-powered analysis generation using LLMs
- Multi-agent analysis system
- Payment verification and debiting
- Advanced whale behavior patterns
- Historical data analysis

## 🛠️ Development Commands

```bash
# Start development server with auto-reload
bun run dev

# Build TypeScript
bun run build

# Type check only
bun run check-types

# Generate Prisma client
cd ../../packages/db
bunx prisma generate

# Create new migration
bunx prisma migrate dev --name description

# Reset database (WARNING: Deletes all data)
bunx prisma migrate reset

# View database in browser
bunx prisma studio
```

## 📝 Environment Variables Reference

| Variable                    | Description                  | Default                         | Required |
| --------------------------- | ---------------------------- | ------------------------------- | -------- |
| `TELEGRAM_BOT_TOKEN`        | Bot token from @BotFather    | -                               | ✅       |
| `TELEGRAM_CHAT_ID`          | Your Telegram chat ID        | -                               | ❌       |
| `DATABASE_URL`              | PostgreSQL connection string | -                               | ✅       |
| `SECRET_KEY`                | 32-char encryption key       | -                               | ✅       |
| `SOLANA_RPC_URL`            | Solana RPC endpoint          | `https://api.devnet.solana.com` | ❌       |
| `SOLANA_NETWORK`            | Network name                 | `devnet`                        | ❌       |
| `WHALE_ALERT_INTERVAL_MS`   | Alert generation interval    | `150000` (2.5min)               | ❌       |
| `MINIMUM_ANALYSIS_COST_SOL` | Cost per analysis            | `0.15`                          | ❌       |

## 🎓 Learning Resources

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Solana Devnet Faucet](https://faucet.solana.com)
- [Solscan Explorer](https://solscan.io)

## 📄 License

This is an MVP project for testing purposes only.

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section
2. Review console logs for errors
3. Verify all environment variables are set
4. Ensure PostgreSQL and bot are running
