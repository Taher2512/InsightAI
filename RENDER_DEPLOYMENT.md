# 🚀 Render Deployment Guide - InsightAI Backend

## Prerequisites

- GitHub repository pushed
- Neon PostgreSQL database URL ready
- All API keys obtained (Telegram, Gemini, Solana wallet)

---

## 📝 Render Configuration

### 1. Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `Taher2512/InsightAI`
4. Select branch: `main`

### 2. Basic Settings

| Setting            | Value                                    |
| ------------------ | ---------------------------------------- |
| **Name**           | `insightai-backend`                      |
| **Region**         | `Oregon (US West)` or closest to you     |
| **Branch**         | `main`                                   |
| **Root Directory** | `apps/backend`                           |
| **Runtime**        | `Node`                                   |
| **Build Command**  | See below ⬇️                             |
| **Start Command**  | See below ⬇️                             |
| **Instance Type**  | Free (or Starter for better performance) |

### 3. Build Command

**Recommended (Simple & Clean):**

```bash
cd ../.. && bun install && cd packages/db && bun run generate && cd ../../apps/backend && bun run build
```

**Alternative (Using --schema flag):**

```bash
cd ../.. && bun install && npx prisma generate --schema=packages/db/prisma/schema.prisma && cd apps/backend && bun run build
```

**Alternative (Using Turbo):**

```bash
cd ../.. && bun install && bunx turbo run build --filter=backend && cd packages/db && bun run generate && cd ../../apps/backend
```

**What it does:**

1. Navigate to monorepo root (`cd ../..`)
2. Install all dependencies including `db` package with matched versions (`bun install`)
3. Navigate to db folder (`cd packages/db`)
4. Generate Prisma Client in `packages/db/generated/prisma` (`bun run generate`)
5. Navigate to backend folder (`cd ../../apps/backend`)
6. Compile TypeScript to JavaScript (`bun run build`)

### 4. Start Command

```bash
node index.js
```

**Why `index.js`?** After TypeScript compilation, `tsc` creates `index.js` from `index.ts`.

---

## 🔐 Environment Variables

Add these in Render's **Environment** tab:

### Telegram Configuration

```env
TELEGRAM_BOT_TOKEN=8476303612:AAGSM_KyOxVN5CiiExj7hIq1sGlEx3ygg3M
TELEGRAM_CHAT_ID=6425157717
```

### Database

```env
DATABASE_URL=postgresql://neondb_owner:npg_j1U2MIOtPHSJ@ep-holy-butterfly-a4mbtjxw-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Security

```env
SECRET_KEY=12345678901234567890123456789012
```

### Solana Configuration

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
DEVNET_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### Bot Configuration

```env
WHALE_ALERT_INTERVAL_MS=150000
MINIMUM_ANALYSIS_COST_SOL=0.15
MINIMUM_ANALYSIS_COST_USDC=1.2
```

### AI Configuration

```env
GOOGLE_GEMINI_API_KEY=AIzaSyBZIaJRRx9IRyO9J4rc-EaaWI0phDyNJ1c
GEMINI_MODEL=gemini-2.5-flash
```

### x402 Protocol (⚠️ UPDATE AFTER FIRST DEPLOY)

```env
X402_RECIPIENT_WALLET=4iKTRXi6ud7TBrvjqG2CpMa9nD58wcdK9thQhWrEmF8k
X402_API_PORT=10000
X402_API_BASE=https://YOUR-APP-NAME.onrender.com/api/x402
X402_PUBLIC_URL=https://YOUR-APP-NAME.onrender.com
AGENT_SERVICE_FEE=0.02
```

**⚠️ Important:** Replace `YOUR-APP-NAME` with your actual Render URL after first deployment!

---

## 🎯 Post-Deployment Steps

### Step 1: Get Your Render URL

After deployment completes, copy your app's URL:

```
https://insightai-backend.onrender.com
```

### Step 2: Update Environment Variables

Go back to Render Environment settings and update:

```env
X402_PUBLIC_URL=https://insightai-backend.onrender.com
X402_API_BASE=https://insightai-backend.onrender.com/api/x402
```

Click **"Save Changes"** - Render will automatically redeploy.

### Step 3: Update Telegram Webhook (If Using Webhooks)

If you're using Telegram webhooks instead of polling, update your webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://insightai-backend.onrender.com/webhook"}'
```

### Step 4: Test the Deployment

1. Check Render logs for successful startup
2. Look for these log messages:
   ```
   ✅ x402 API Server running on port 10000
   🤖 Telegram bot connected successfully
   ```
3. Test Telegram bot: `/start`
4. Test x402 endpoints:
   ```bash
   curl https://insightai-backend.onrender.com/api/x402/historical-patterns?address=test
   ```

---

## 🔧 Troubleshooting

### Build Fails with "Cannot find module 'db'"

**Solution:** Make sure Root Directory is set to `apps/backend` and build command navigates to monorepo root first.

### "PORT already in use" Error

**Solution:** Updated! The code now uses `process.env.PORT` which Render provides automatically.

### Database Connection Issues

**Solution:** Check that `DATABASE_URL` includes `?sslmode=require` for Neon PostgreSQL.

### Prisma Client Not Generated

**Solution:** Make sure build command includes `npx prisma generate` at the end.

### x402 APIs Return 404

**Solution:** Update `X402_PUBLIC_URL` and `X402_API_BASE` with your actual Render URL.

---

## 📊 Monitoring

### View Logs

- Go to your service dashboard
- Click **"Logs"** tab
- Monitor real-time application logs

### Check Health

Visit: `https://your-app.onrender.com/health`

### Test x402 Endpoints

```bash
# Historical Patterns
curl https://your-app.onrender.com/api/x402/historical-patterns?address=test

# Old Faithful Analysis
curl https://your-app.onrender.com/api/x402/old-faithful-analysis?address=test

# Sentiment Analysis
curl https://your-app.onrender.com/api/x402/sentiment-analysis?address=test

# Market Impact
curl https://your-app.onrender.com/api/x402/market-impact?address=test
```

---

## 🔄 Updates & Redeployment

### Automatic Deployment

Render automatically redeploys when you push to `main` branch:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

### Manual Deployment

1. Go to your service dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 💡 Performance Tips

### 1. Upgrade Instance Type

Free tier has cold starts. Consider upgrading to **Starter ($7/month)** for:

- No cold starts
- More memory
- Better performance

### 2. Use Background Workers

For long-running tasks like whale monitoring, consider using a separate **Background Worker** service.

### 3. Database Connection Pooling

Neon PostgreSQL already provides connection pooling via the `-pooler` endpoint in your URL.

### 4. Add Health Check Endpoint

Already have it! The server responds to health checks automatically.

---

## 🎉 Success Checklist

- [ ] Render service created and deployed successfully
- [ ] All environment variables added
- [ ] `X402_PUBLIC_URL` and `X402_API_BASE` updated with real Render URL
- [ ] Telegram bot responds to `/start`
- [ ] x402 API endpoints accessible
- [ ] Whale alerts triggering
- [ ] AI analysis working with real oracle data
- [ ] Database connections stable
- [ ] Logs showing no errors

---

## 📞 Need Help?

- **Render Docs:** https://render.com/docs
- **Render Support:** https://render.com/support
- **Check Logs:** Always start here for debugging

---

## 🔒 Security Notes

1. **Never commit `.env` file** to Git (already in `.gitignore`)
2. **Rotate API keys** periodically
3. **Use strong SECRET_KEY** (32+ characters)
4. **Monitor Solana wallet** for unauthorized transactions
5. **Set up Render notifications** for deployment failures

---

**You're all set! 🚀 Deploy with confidence!**
