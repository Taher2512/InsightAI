# Quick Testing Guide

## ✅ Bot is Running!

Your Solana Whale Tracker Telegram Bot is now live and ready for testing.

## 📱 Testing Steps

### 1. Start Conversation with Bot

Open Telegram and send:

```
/start
```

**Expected:** Welcome message with bot introduction and available commands

---

### 2. Create Your Wallet

```
/wallet
```

**Expected:**

- New Solana devnet wallet created
- Public address displayed
- Solscan link provided
- Instructions to deposit SOL

**Note:** Save your public address! You'll need it for depositing funds.

---

### 3. Fund Your Wallet (Devnet SOL)

#### Option A: Solana CLI

```bash
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

#### Option B: Web Faucet

Visit: https://faucet.solana.com

- Paste your wallet address
- Request airdrop
- Wait ~30 seconds

---

### 4. Check Balance

```
/balance
```

**Expected:**

- Fetches real balance from Solana devnet
- Shows formatted balance
- Indicates if you have enough for analysis (0.15 SOL)

---

### 5. View Tracked Whales

```
/track
```

**Expected:** List of 10 whale addresses being monitored

---

### 6. View Recent Alerts

```
/alerts
```

**Expected:**

- List of recent whale transaction alerts
- If no alerts yet: "No recent whale alerts"
- After 2-3 minutes: Should see generated alerts

---

### 7. Get Deposit Instructions

```
/deposit
```

**Expected:**

- Your wallet address
- Network info (Devnet)
- Deposit instructions
- Solscan link

---

### 8. Wait for Whale Alerts (Automatic)

**After 2-3 minutes**, you should receive:

```
🐋 WHALE ALERT

Address: 5tzFkiKs...uAi9
Action: 📥 Deposited 15,234 SOL
Exchange: Binance
Time: Just now
Value: ~$2,285,100

[Button: 🔍 Get AI Analysis ($0.15 SOL)]
```

---

### 9. Test AI Analysis Button

**Scenario A - Insufficient Balance (< 0.15 SOL):**

- Click button
- **Expected:** "⚠️ Insufficient balance" message

**Scenario B - Sufficient Balance (≥ 0.15 SOL):**

- Click button
- **Expected:** "✅ Analysis request received" acknowledgment
- Note: Actual payment/analysis comes in Phase 2

---

### 10. Help Command

```
/help
```

**Expected:** List of all commands and their descriptions

---

## 🧪 Full Testing Checklist

- [ ] `/start` shows welcome message
- [ ] `/wallet` creates new wallet (first time)
- [ ] `/wallet` shows existing wallet (second time)
- [ ] Wallet is saved in PostgreSQL database
- [ ] `/balance` fetches real balance from blockchain
- [ ] Airdrop arrives in wallet (check on Solscan)
- [ ] `/track` shows 10 whale addresses
- [ ] `/alerts` displays stored alerts
- [ ] `/deposit` shows correct wallet address
- [ ] `/help` lists all commands
- [ ] Bot generates alerts every 2-3 minutes
- [ ] Alert messages are properly formatted
- [ ] "Get AI Analysis" button appears on alerts
- [ ] Insufficient balance shows error
- [ ] Sufficient balance acknowledges request
- [ ] Database stores: users, wallets, alerts, analyses

---

## 🎯 Expected Bot Behavior

### Mock Alert Generation

- **Frequency:** Every 2-3 minutes (150,000ms)
- **Amount:** Random 1,000 - 50,000 SOL
- **Action:** 50/50 split between deposits and withdrawals
- **Exchanges:** Binance, Coinbase, Kraken, OKX, Bybit (random)

### Database Persistence

All data should persist:

- User info (Telegram ID, username)
- Wallet (public key, encrypted private key, balance)
- Whale alerts (address, amount, timestamp, analyzed status)
- Analysis requests (linked to user and alert)

---

## 🔍 Verify Database

You can view your database data with Prisma Studio:

```bash
cd packages/db
bunx prisma studio
```

This opens a web interface at http://localhost:5555

Check tables:

- **users** - Your Telegram user
- **wallets** - Your created wallet
- **whale_alerts** - Generated alerts
- **analyses** - Analysis requests

---

## 🐛 Troubleshooting

### Bot not responding

```bash
# Check if bot is still running
# Look for errors in terminal

# Restart bot
cd apps/backend
bun run index.ts
```

### Balance shows 0 after airdrop

- Wait 30-60 seconds for devnet confirmation
- Run `/balance` again
- Check on Solscan: https://solscan.io (select Devnet)

### No whale alerts

- Ensure bot has been running for 2-3 minutes
- Check terminal for error messages
- Verify at least one user exists (you) in database

### Button not working

- Make sure you clicked the button, not just tapped the message
- Check if you have a wallet created
- Verify bot is still running

---

## 📊 Monitor Bot Activity

Watch the terminal for logs:

```
🤖 Starting Solana Whale Tracker Bot...
✅ Database connected
🐋 Starting whale monitoring (interval: 150000ms)
✅ Bot is running!

🐋 Created whale alert: deposit 23456 SOL
📤 Sent alert to 1 users
```

---

## 🚀 What's Working (Phase 1 MVP)

✅ Telegram bot with all commands
✅ Wallet creation and encryption
✅ Real Solana devnet integration
✅ Balance checking from blockchain
✅ Mock whale alert generation
✅ Database persistence with Prisma
✅ Alert notifications with buttons
✅ Balance verification for analysis
✅ User-friendly error messages

---

## 🚧 Coming in Phase 2

❌ Real blockchain indexing
❌ x402 payment processing
❌ Actual AI analysis generation
❌ Payment debiting from wallet
❌ Analysis report generation
❌ Advanced whale patterns
❌ Historical data analysis

---

## 🎓 Tips for Testing

1. **Use separate Telegram account** for testing if you want to simulate multiple users
2. **Keep terminal visible** to see bot logs and debug issues
3. **Test insufficient balance** scenario before funding wallet
4. **Wait full 2-3 minutes** for first alert to generate
5. **Check Solscan** to verify your wallet exists on devnet
6. **Use Prisma Studio** to see database changes in real-time

---

## 📸 Expected Screenshots Flow

1. `/start` → Welcome screen
2. `/wallet` → Wallet created with address
3. Airdrop → Funding wallet
4. `/balance` → Balance confirmed
5. Wait → Alert arrives automatically
6. Click button → Analysis acknowledged

---

## ✅ Success Criteria

Your MVP is successful if:

- ✅ Bot responds to all commands
- ✅ Wallet is created and stored securely
- ✅ Balance is fetched from Solana devnet
- ✅ Alerts generate every 2-3 minutes
- ✅ Database persists all data
- ✅ UI flows work smoothly
- ✅ No crashes or unhandled errors

---

## 🎉 Next Steps After Testing

1. Document any bugs found
2. Test edge cases (multiple wallets, rapid commands, etc.)
3. Plan Phase 2 features
4. Consider mainnet deployment (after thorough testing)
5. Implement real payment processing
6. Add AI analysis integration

---

**Happy Testing! 🐋📊🤖**

For issues, check `SETUP_GUIDE.md` for troubleshooting.
