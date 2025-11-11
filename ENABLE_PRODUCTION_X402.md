# Enable Production x402 Payments

## Current State: Demo Mode
- Server on localhost - Corbits can't reach it
- No 402 responses - payments not required
- USDC balance doesn't change

## Enable Real Payments

### Option 1: Use ngrok (Quick Testing)

1. **Install ngrok:**
   ```bash
   brew install ngrok
   # or download from https://ngrok.com
   ```

2. **Start your x402 server:**
   ```bash
   bun run apps/backend/index.ts
   ```

3. **In another terminal, expose port 3001:**
   ```bash
   ngrok http 3001
   ```

4. **Copy the public URL** (e.g., `https://abc123.ngrok.io`)

5. **Update .env file:**
   ```bash
   X402_API_BASE=https://abc123.ngrok.io/api/x402
   ```

6. **Restart the bot**

7. **Test analysis** - USDC will actually be deducted!

### Option 2: Deploy to Production

Deploy to Vercel, Railway, or Render:

```bash
# Example with Railway
railway login
railway init
railway up
```

Then update `X402_API_BASE` in .env to your deployed URL.

## Verify Real Payments

After enabling production mode:

1. Check starting balance: `/balance`
2. Run analysis
3. Check ending balance: `/balance`
4. **USDC should be ~1.2 USDC less**

## Why Demo Mode Exists

- Corbits facilitator requires publicly accessible URLs
- Can't verify payments on localhost
- Demo mode lets you test functionality without deployment
- Agent code is production-ready, just waiting for public URL
