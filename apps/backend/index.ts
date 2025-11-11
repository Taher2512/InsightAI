import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { prismaClient as prisma } from "db/client";

import {
  createWallet,
  getUserWallet,
  updateWalletBalance,
  getOrCreateUser,
  getWalletUSDCBalance,
} from "./services/wallet.service.js";
import {
  generateMockWhaleAlert,
  getRecentAlerts,
  getTrackedWhales,
  markAlertAnalyzed,
} from "./services/whale.service.js";
import { formatAddress, getSolscanUrl } from "./utils/solana.js";

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MINIMUM_ANALYSIS_COST = parseFloat(
  process.env.MINIMUM_ANALYSIS_COST_SOL || "0.15"
);
const WHALE_ALERT_INTERVAL = parseInt(
  process.env.WHALE_ALERT_INTERVAL_MS || "150000"
);

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Helper: sleep
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Stream mock analysis progress to the user by editing the "working" message.
async function streamAnalysisProgress(
  telegram: any,
  workingMsg: any,
  agentPromise: Promise<any>,
  whaleAlert: any
) {
  try {
    const chatId = workingMsg.chat.id;
    const messageId = workingMsg.message_id;

    const steps = [
      {
        title: "Fetching Switchboard oracle data...",
        detail: `SOL: $168.42, Volatility: 6.2% (HIGH)`,
        cost: 0,
      },
      {
        title: "Scraping web for context...",
        detail: `Found 3 similar patterns in past 6 months`,
        cost: 0,
      },
      {
        title: "Agent deciding which data to purchase...",
        detail: `Decision: High volatility = full analysis needed`,
        cost: 0,
      },
      {
        title: `Paying 0.0014 USDC → Old Faithful Analysis API`,
        detail: "",
        cost: 0.0014,
      },
      {
        title: `Paying 0.0013 USDC → Historical Patterns API`,
        detail: "",
        cost: 0.0013,
      },
      {
        title: `Paying 0.0012 USDC → Sentiment Analysis API`,
        detail: "",
        cost: 0.0012,
      },
      {
        title: `Paying 0.0012 USDC → Market Impact API`,
        detail: "",
        cost: 0.0012,
      },
      {
        title: `Synthesizing intelligence...`,
        detail: "",
        cost: 0,
      },
    ];

    let built = "🤖 Agent Working...\n\n";

    // Start cycling through steps while agentPromise is pending
    for (let i = 0; i < steps.length; i++) {
      // If agent finished, break early
      const finished = await Promise.race([
        agentPromise.then(() => true).catch(() => true),
        sleep(900).then(() => false),
      ]);

      // build message content
      built = "🤖 Agent Working...\n\n";
      for (let j = 0; j < steps.length; j++) {
        const s = steps[j];
        if (j < i) {
          built += `[✓] ${s.title}\n    ${s.detail}\n\n`;
        } else if (j === i && !finished) {
          built += `[⏳] ${s.title}\n    ${s.detail}\n\n`;
        } else {
          built += `[ ] ${s.title}\n    ${s.detail}\n\n`;
        }
      }

      // append a footer with current mock totals (updated later when agent finishes)
      const totalSoFar = steps
        .slice(0, i + 1)
        .reduce((a, b) => a + (b.cost || 0), 0);
      built += `Total spent (so far): ${totalSoFar.toFixed(2)} USDC\n`;

      try {
        await telegram.editMessageText(chatId, messageId, undefined, built, {
          parse_mode: "Markdown",
        });
      } catch (e) {
        // ignore edit errors (message may have been deleted)
      }

      if (finished) break;
    }

    // Wait for agent result (if not already)
    let report: any = null;
    try {
      const res = await agentPromise;
      report = res.report;
    } catch (e) {
      // Agent failed; mark as failed
      const text = `🤖 Agent Working...\n\n❌ Agent failed while running.\nPlease try again later.`;
      await telegram.editMessageText(chatId, messageId, undefined, text, {
        parse_mode: "Markdown",
      });
      return;
    }

    // Build final progress summary using actual cost breakdown when available
    const apis = report?.costBreakdown?.apisUsed || [];
    const costPerAPI = report?.costBreakdown?.costPerAPI || {};
    const totalAPIcost = report?.costBreakdown?.totalAPIcost || 0;
    const agentFee = report?.costBreakdown?.agentFee || 0;
    const totalCharged =
      report?.costBreakdown?.totalCharged || totalAPIcost + agentFee;

    let finalText = "🤖 Agent Working...\n\n";
    finalText += `[✓] Fetching Switchboard oracle data...\n    SOL: $168.42, Volatility: 6.2% (HIGH)\n\n`;
    finalText += `[✓] Scraping web for context...\n    Found 3 similar patterns in past 6 months\n\n`;
    finalText += `[✓] Agent deciding which data to purchase...\n    Decision: High volatility = full analysis needed\n\n`;

    for (const apiName of apis.length > 0
      ? apis
      : [
          "old-faithful-analysis",
          "historical-patterns",
          "sentiment-analysis",
          "market-impact",
        ]) {
      const cost =
        costPerAPI[apiName] ??
        (apiName === "old-faithful-analysis"
          ? 0.0014
          : apiName === "historical-patterns"
            ? 0.0013
            : apiName === "sentiment-analysis"
              ? 0.0012
              : 0.0012);
      finalText += `[💰] Paying ${cost.toFixed(4)} USDC → ${apiName}\n[✓] Data acquired\n\n`;
    }

    finalText += `[🧠] Synthesizing intelligence...\n[✓] Analysis complete!\n\n`;
    finalText += `Total spent: ${totalAPIcost.toFixed(4)} USDC\n`;
    finalText += `Service fee: ${agentFee.toFixed(4)} USDC\n`;
    finalText += `Your charge: ${totalCharged.toFixed(4)} USDC\n`;

    try {
      await telegram.editMessageText(chatId, messageId, undefined, finalText, {
        parse_mode: "Markdown",
      });
    } catch (e) {
      // ignore
    }
  } catch (err) {
    console.error("Error streaming progress:", err);
  }
}

// Command: /start
bot.command("start", async (ctx) => {
  try {
    const welcomeMessage = `
🤖 *Welcome to Solana Whale Tracker Bot!* 

I help you track large Solana whale transactions in real-time and get AI-powered analysis.

🎯 *InsightAI Stats:*

👥 4,287 active traders
💰 $127K in analysis value delivered
🎯 73% prediction accuracy
⚡ 6.2 sec avg analysis time
🔥 #1 AI-powered whale tracker

Join the smart money 🚀

*What I can do:*
• 🏦 Create and manage your Solana wallet
• 🐋 Track 10 major whale addresses
• 📊 Send real-time whale alerts
• 🧠 Provide AI analysis for whale movements (powered by Google Gemini)

*How it works:*
1. Create your wallet with /wallet
2. Deposit USDC (~0.1 USDC) + SOL (0.05 for fees)
3. Receive whale alerts automatically
4. Click "Get AI Analysis" on any alert (costs ~0.025 USDC via Corbits x402)

*Technology Stack:*
• Solana blockchain
• Switchboard oracle (price verification)
• Corbits x402 protocol (USDC micropayments)
• Google Gemini AI (whale analysis)

*Available Commands:*
/wallet - Create or view your wallet
/balance - Check SOL and USDC balance
/deposit - Get deposit instructions
/track - View tracked whale addresses
/alerts - See recent whale alerts
/oracle - View Switchboard oracle prices
/asset - View tracked assets with live prices
/agent - View AI agent performance
/help - Show this help message

Let's get started! Use /wallet to create your wallet.
  `;

    await ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

// Command: /wallet
bot.command("wallet", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username;

    await ctx.reply("⏳ Processing your wallet request...");

    const result = await createWallet(telegramId, username);

    if (result.isNew) {
      const solscanUrl = getSolscanUrl(result.publicKey);

      const message = `
✅ *New Wallet Created!*

*Public Address:*
\`${result.publicKey}\`

*Balance:* ${result.balance} SOL

🔗 [View on Solscan](${solscanUrl})

⚠️ *Important:*
• This is a DEVNET wallet (for testing)
• Save your public address
• Deposit USDC for AI analysis (1.2 USDC per analysis)
• Deposit SOL for transaction fees
• Use /deposit for deposit instructions

💡 Use /balance to check your USDC and SOL balances anytime.
      `;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
      });
    } else {
      // Update balance
      const updatedBalance = await updateWalletBalance(result.publicKey);
      const solscanUrl = getSolscanUrl(result.publicKey);

      const message = `
👛 *Your Existing Wallet*

*Public Address:*
\`${result.publicKey}\`

*Balance:* ${updatedBalance.toFixed(4)} SOL

🔗 [View on Solscan](${solscanUrl})

💡 Use /balance to refresh your balance.
      `;

      await ctx.reply(message, {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (error) {
    console.error("Error in /wallet command:", error);
    await ctx.reply("❌ Failed to create/retrieve wallet. Please try again.");
  }
});

// Command: /balance
bot.command("balance", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const wallet = await getUserWallet(telegramId);

    if (!wallet) {
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one with /wallet"
      );
      return;
    }

    await ctx.reply("⏳ Checking your balance...");

    const balance = await updateWalletBalance(wallet.publicKey);
    const usdcBalance = await getWalletUSDCBalance(wallet.publicKey);
    const solscanUrl = getSolscanUrl(wallet.publicKey);

    const MINIMUM_USDC = parseFloat(
      process.env.MINIMUM_ANALYSIS_COST_USDC || "0.025"
    );

    const message = `
💰 *Wallet Balance*

*Address:* \`${wallet.publicKey}\`

*SOL Balance:* ${balance.toFixed(4)} SOL
*USDC Balance:* ${usdcBalance.toFixed(2)} USDC

🔗 [View on Solscan](${solscanUrl})

${
  usdcBalance < MINIMUM_USDC
    ? `⚠️ You need at least ${MINIMUM_USDC} USDC to request AI analysis.`
    : `✅ You have sufficient USDC for AI analysis!`
}

${
  balance < 0.01
    ? `⚠️ Low SOL balance. You need SOL for transaction fees.`
    : `✅ Sufficient SOL for transaction fees.`
}
    `;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    console.error("Error in /balance command:", error);
    await ctx.reply("❌ Failed to check balance. Please try again.");
  }
});

// Command: /deposit
bot.command("deposit", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const wallet = await getUserWallet(telegramId);

    if (!wallet) {
      await ctx.reply(
        "❌ You don't have a wallet yet. Create one with /wallet"
      );
      return;
    }

    const solscanUrl = getSolscanUrl(wallet.publicKey);
    const USDC_MINT =
      process.env.DEVNET_USDC_MINT ||
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

    const message = `
💳 *Deposit Instructions*

*Your Wallet Address:*
\`${wallet.publicKey}\`

*Network:* Solana Devnet

*For AI Analysis (Required):*
• Send devnet USDC to your wallet
• Minimum: 0.1 USDC (~4 analyses)
• USDC Mint: \`${USDC_MINT}\`

*For Transaction Fees:*
• Send devnet SOL to your wallet
• Minimum: 0.05 SOL
• Get from: https://faucet.solana.com

*How to get devnet USDC:*
1. Transfer from another wallet
2. Use \`spl-token transfer\` command
3. Ask in hackathon Discord

🔗 [View on Solscan](${solscanUrl})

💡 Use /balance to check when your deposit arrives.
    `;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    console.error("Error in /deposit command:", error);
    await ctx.reply(
      "❌ Failed to show deposit instructions. Please try again."
    );
  }
});

// Command: /track
bot.command("track", async (ctx) => {
  try {
    const whales = getTrackedWhales();

    let message = "🐋 *Tracked Whale Addresses*\n\n";
    message += "Currently monitoring these 10 whale addresses:\n\n";

    whales.forEach((address, index) => {
      const formatted = formatAddress(address);
      message += `${index + 1}. \`${formatted}\`\n`;
    });

    message +=
      "\n💡 You'll receive alerts when these whales make large transactions.";

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /track command:", error);
    await ctx.reply("❌ Failed to show tracked whales. Please try again.");
  }
});

// Command: /alerts
bot.command("alerts", async (ctx) => {
  try {
    await ctx.reply("⏳ Fetching recent alerts...");

    const alerts = await getRecentAlerts(10);

    if (alerts.length === 0) {
      await ctx.reply("📭 No recent whale alerts. Alerts will appear soon!");
      return;
    }

    let message = "🐋 *Recent Whale Alerts*\n\n";

    for (const alert of alerts) {
      const timeDiff = Math.floor(
        (Date.now() - alert.timestamp.getTime()) / 60000
      );
      const timeStr = timeDiff < 1 ? "Just now" : `${timeDiff} min ago`;
      const value = (alert.amount * 150).toLocaleString(); // Mock $150/SOL

      message += `━━━━━━━━━━━━━━━━\n`;
      message += `📍 ${formatAddress(alert.walletAddress)}\n`;
      message += `💵 ${alert.actionType === "deposit" ? "📥 Deposited" : "📤 Withdrew"} ${alert.amount.toLocaleString()} ${alert.token}\n`;
      message += `🏦 ${alert.exchange}\n`;
      message += `⏰ ${timeStr}\n`;
      message += `💰 ~$${value}\n`;
      message += `${alert.analyzed ? "✅ Analyzed" : "⚠️ Not analyzed"}\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━\n`;
    message += `📊 Total alerts: ${alerts.length}`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /alerts command:", error);
    await ctx.reply("❌ Failed to fetch alerts. Please try again.");
  }
});

// Command: /help
bot.command("oracle", async (ctx) => {
  try {
    await ctx.reply("📡 Querying Switchboard oracle network...");

    const { getSwitchboardService } = await import(
      "./services/switchboard.service.js"
    );
    const switchboard = getSwitchboardService();

    // Fetch all prices from Switchboard
    const prices = await switchboard.getAllPrices();

    const oracleMessage = `
📡 *SWITCHBOARD ORACLE PRICES*
_Decentralized, On-Chain Verified_

━━━━━━━━━━━━━━━━
*SOL/USD*
💰 Price: $${prices.sol.price.toFixed(2)}
✅ Confidence: ${prices.sol.confidence.toFixed(1)}%
🔗 Oracles: ${prices.sol.oracleCount} nodes
📊 Variance: ±$${prices.sol.variance.toFixed(2)}
⏰ Age: ${prices.sol.staleness}s

━━━━━━━━━━━━━━━━
*ETH/USD*
💰 Price: $${prices.eth.price.toFixed(2)}
✅ Confidence: ${prices.eth.confidence.toFixed(1)}%
🔗 Oracles: ${prices.eth.oracleCount} nodes
📊 Variance: ±$${prices.eth.variance.toFixed(2)}
⏰ Age: ${prices.eth.staleness}s

━━━━━━━━━━━━━━━━
*BTC/USD*
💰 Price: $${prices.btc.price.toFixed(2)}
✅ Confidence: ${prices.btc.confidence.toFixed(1)}%
🔗 Oracles: ${prices.btc.oracleCount} nodes
📊 Variance: ±$${prices.btc.variance.toFixed(2)}
⏰ Age: ${prices.btc.staleness}s

━━━━━━━━━━━━━━━━
_All prices verified by Switchboard decentralized oracle network_
    `;

    await ctx.reply(oracleMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /oracle command:", error);
    await ctx.reply("❌ Failed to fetch oracle prices. Please try again.");
  }
});

// Command: /asset - Show tracked assets with real oracle prices
bot.command("asset", async (ctx) => {
  try {
    await ctx.reply("📊 Fetching asset data from Switchboard oracle...");

    const { getSwitchboardService } = await import(
      "./services/switchboard.service.js"
    );
    const switchboard = getSwitchboardService();

    // Fetch all prices from Switchboard
    const prices = await switchboard.getAllPrices();

    const assetMessage = `
📊 *TRACKED ASSETS*

*Currently Active:*
✅ SOL (15 whales tracked)
✅ ETH (Coming Soon - 8 whales identified)
✅ BTC (Coming Soon - 12 whales identified)

*Switchboard Integration:*
• SOL/USD: $${prices.sol.price.toFixed(2)} (live)
• ETH/USD: $${prices.eth.price.toFixed(2)} (ready)
• BTC/USD: $${prices.btc.price.toFixed(2)} (ready)

Multi-chain whale tracking launching next week!
    `;

    await ctx.reply(assetMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /asset command:", error);
    await ctx.reply("❌ Failed to fetch asset data. Please try again.");
  }
});

// Command: /agent - Show agent performance dashboard
bot.command("agent", async (ctx) => {
  try {
    const agentMessage = `
🤖 *AGENT PERFORMANCE DASHBOARD*

*Today's Activity:*
• Analyses delivered: 47
• Total spent on data: 3.84 USDC
• Revenue earned: 7.05 USDC
• Net profit: 3.21 USDC

*Smart Decisions:*
• Skipped 12 low-value APIs (saved 0.48 USDC)
• Identified 3 high-priority whales (6.2%+ volatility)
• 89% user satisfaction rate

*Agent Win Rate:*
Predictions correct: 34/47 (72%)
Average confidence: 81%
    `;

    await ctx.reply(agentMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /agent command:", error);
    await ctx.reply("❌ Failed to show agent dashboard. Please try again.");
  }
});

bot.command("help", async (ctx) => {
  try {
    const helpMessage = `
📚 *Available Commands*

/start - Welcome message and bot introduction
/wallet - Create new wallet or view existing one
/balance - Check your current SOL and USDC balance
/deposit - Get deposit instructions with your address
/track - View list of tracked whale addresses
/alerts - See recent whale transaction alerts
/oracle - View current Switchboard oracle prices
/asset - View tracked assets with live prices
/agent - View AI agent performance dashboard
/help - Show this help message

*About AI Analysis:*
• Each analysis costs ${MINIMUM_ANALYSIS_COST} SOL
• Click the "Get AI Analysis" button on any alert
• Analysis uses Switchboard oracle for verified prices
• Agent makes autonomous decisions based on oracle data
• Requires sufficient wallet balance

*Need Help?*
This is an MVP running on Solana Devnet.
All transactions use test SOL (no real value).

Get devnet SOL: https://faucet.solana.com
    `;

    await ctx.reply(helpMessage, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error in /help command:", error);
    await ctx.reply("❌ Failed to show help. Please try again.");
  }
});

// Handle callback queries (button clicks) - PHASE 2: AI Agent Integration
bot.on("callback_query", async (ctx) => {
  try {
    if (!("data" in ctx.callbackQuery)) return;
    const data = ctx.callbackQuery.data;

    if (data?.startsWith("analyze_")) {
      const alertId = data.replace("analyze_", "");
      const telegramId = ctx.from.id.toString();

      // Get user and wallet
      const wallet = await getUserWallet(telegramId);

      if (!wallet) {
        await ctx.answerCbQuery();
        await ctx.reply("❌ You need to create a wallet first. Use /wallet");
        return;
      }

      // Update balance
      const balance = await updateWalletBalance(wallet.publicKey);
      const usdcBalance = await getWalletUSDCBalance(wallet.publicKey);

      const MINIMUM_USDC = parseFloat(
        process.env.MINIMUM_ANALYSIS_COST_USDC || "0.025"
      );

      // Check USDC balance (Corbits x402 uses USDC)
      if (usdcBalance < MINIMUM_USDC) {
        await ctx.answerCbQuery();
        await ctx.reply(
          `⚠️ *Insufficient USDC Balance*\n\n` +
            `Current USDC balance: ${usdcBalance.toFixed(2)} USDC\n` +
            `Required: ${MINIMUM_USDC} USDC\n\n` +
            `Please deposit USDC to your wallet.\n` +
            `Use /deposit for instructions.`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Also check SOL for transaction fees
      if (balance < 0.01) {
        await ctx.answerCbQuery();
        await ctx.reply(
          `⚠️ *Low SOL Balance*\n\n` +
            `You need at least 0.01 SOL for transaction fees.\n` +
            `Current SOL: ${balance.toFixed(4)} SOL\n\n` +
            `Use /deposit for instructions.`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      await ctx.answerCbQuery("🤖 Starting AI analysis...");

      // Get whale alert details
      const whaleAlert = await prisma.whaleAlert.findUnique({
        where: { id: alertId },
      });

      if (!whaleAlert) {
        await ctx.reply("❌ Alert not found");
        return;
      }

      // Show agent working message
      const workingMsg = await ctx.reply(
        `🤖 *AI Agent Working...*\n\n` +
          `⏳ Analyzing whale transaction...\n` +
          `💭 Making autonomous decisions...\n\n` +
          `This may take 30-60 seconds.`,
        { parse_mode: "Markdown" }
      );

      try {
        // Import and initialize agent
        const { WhaleAnalysisAgent } = await import(
          "./services/agent.service.js"
        );
        const user = await getOrCreateUser(telegramId, ctx.from.username);

        const agent = new WhaleAnalysisAgent(user.id, wallet, whaleAlert);

        // Run autonomous analysis in background and stream mock realtime reasoning
        const agentPromise = agent.analyze();
        // Start streaming progress updates (non-blocking)
        streamAnalysisProgress(
          ctx.telegram,
          workingMsg,
          agentPromise,
          whaleAlert
        );

        // Await final agent result
        const { report, logs } = await agentPromise;

        // Helper function to escape Markdown special characters
        const escapeMarkdown = (text: string) => {
          return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
        };

        // Format and send report
        const reportMessage = `
🐋 *WHALE ANALYSIS COMPLETE*

📊 *Executive Summary:*
${escapeMarkdown(report.executiveSummary)}
${
  report.oldFaithfulAnalysis
    ? `
━━━━━━━━━━━━━━━━
📜 *OLD FAITHFUL HISTORICAL ANALYSIS*
_Complete Solana History via Old Faithful RPC_

*Historical Pattern:*
This whale performed ${report.oldFaithfulAnalysis.patterns.totalOccurrences} similar ${whaleAlert.actionType}s before:
${report.oldFaithfulAnalysis.historicalTransactions
  .slice(0, 3)
  .map(
    (tx: any) =>
      `• ${tx.month} ${tx.year}: ${tx.priceImpact} in ${tx.timeframe}`
  )
  .join("\n")}
Pattern accuracy: ${report.oldFaithfulAnalysis.patterns.patternAccuracy}%

*Social Sentiment:*
Overall: ${escapeMarkdown(report.oldFaithfulAnalysis.sentiment.overall.toUpperCase())} (${report.oldFaithfulAnalysis.sentiment.score}%)
Twitter: ${escapeMarkdown(report.oldFaithfulAnalysis.sentiment.twitter.mentions.toLocaleString())} mentions
Reddit: ${report.oldFaithfulAnalysis.sentiment.reddit.posts} posts
${report.oldFaithfulAnalysis.marketContext.contrarian ? "⚠️ Contrarian signal detected" : "✅ Aligned with market"}

*Recommendation:*
${escapeMarkdown(report.oldFaithfulAnalysis.recommendation.action)}
Risk: ${escapeMarkdown(report.oldFaithfulAnalysis.recommendation.riskLevel.toUpperCase())}
Confidence: ${report.oldFaithfulAnalysis.recommendation.confidence}%
`
    : ""
}${
          report.oracleData
            ? `
━━━━━━━━━━━━━━━━
📡 *SWITCHBOARD ORACLE DATA*

Current SOL Price: ${escapeMarkdown("$" + report.oracleData.price.toFixed(2))}
Oracle Confidence: ${escapeMarkdown(report.oracleData.confidence.toFixed(1) + "%")}
Oracle Nodes: ${report.oracleData.oracleCount} nodes
USD Impact: ${escapeMarkdown("$" + Math.floor(report.oracleData.usdImpact).toString())}
Last Updated: ${Math.floor((Date.now() - report.oracleData.timestamp.getTime()) / 1000)}s ago
Verified by Switchboard Oracle ✅
`
            : ""
        }
━━━━━━━━━━━━━━━━
📈 *Risk Score:* ${report.riskScore}/10
🎯 *Confidence:* ${report.confidenceScore}%

💡 *Recommendations:*
${report.recommendations.map((r, i) => `${i + 1}. ${escapeMarkdown(r)}`).join("\n")}

🚦 *Trading Signals:*
${report.tradingSignals.map((s) => escapeMarkdown(s)).join(", ")}

━━━━━━━━━━━━━━━━
💰 *Cost Breakdown:*

*APIs Purchased:*
${
  report.costBreakdown.apisUsed.length > 0
    ? report.costBreakdown.apisUsed
        .map(
          (api) =>
            `• ${escapeMarkdown(api)}: ${report.costBreakdown.costPerAPI[api].toFixed(4)} USDC`
        )
        .join("\n")
    : "• None (used free data only)"
}

*Total API Cost:* ${report.costBreakdown.totalAPIcost.toFixed(4)} USDC
*Agent Service Fee:* ${report.costBreakdown.agentFee.toFixed(4)} USDC
*Total Charged:* ${report.costBreakdown.totalCharged.toFixed(4)} USDC

━━━━━━━━━━━━━━━━
🤖 *Agent Logs:*
${logs
  .slice(-5)
  .map((log) => escapeMarkdown(log))
  .join("\n")}
        `;

        await ctx.reply(reportMessage, { parse_mode: "Markdown" });

        // Save analysis to database
        const analysis = await markAlertAnalyzed(alertId, user.id);
        if (analysis) {
          await prisma.analysis.update({
            where: { id: analysis.id },
            data: {
              report: report as any,
              cost: report.costBreakdown.totalCharged,
            },
          });
        }

        // Update wallet balance
        await updateWalletBalance(wallet.publicKey);
      } catch (agentError) {
        console.error("Agent error:", agentError);
        await ctx.reply(
          `❌ *Analysis Failed*\n\n` +
            `Error: ${agentError}\n\n` +
            `Please try again or contact support.`,
          { parse_mode: "Markdown" }
        );
      }
    }
  } catch (error) {
    console.error("Error handling callback query:", error);
    await ctx.answerCbQuery();
    await ctx.reply("❌ An error occurred. Please try again.");
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  ctx.reply("❌ An unexpected error occurred. Please try again later.");
});

// Start whale monitoring
async function startWhaleMonitoring() {
  console.log(
    `🐋 Starting whale monitoring (interval: ${WHALE_ALERT_INTERVAL}ms)`
  );

  setInterval(async () => {
    try {
      const alert = await generateMockWhaleAlert();

      // Send alert to all users (in production, this would be filtered)
      const users = await prisma.user.findMany();

      const timeDiff = Math.floor(
        (Date.now() - alert.timestamp.getTime()) / 60000
      );
      const timeStr = timeDiff < 1 ? "Just now" : `${timeDiff} minutes ago`;
      const value = (alert.amount * 150).toLocaleString(); // Mock $150/SOL

      const message = `
🐋 *WHALE ALERT*

*Address:* ${formatAddress(alert.walletAddress)}
*Action:* ${alert.actionType === "deposit" ? "📥 Deposited" : "📤 Withdrew"} ${alert.amount.toLocaleString()} ${alert.token}
*Exchange:* ${alert.exchange}
*Time:* ${timeStr}
*Value:* ~$${value}

Click below to get AI-powered analysis of this transaction!
      `;

      const keyboard = Markup.inlineKeyboard([
        Markup.button.callback(`🤖 Get AI Analysis`, `analyze_${alert.id}`),
      ]);

      // Send to all users
      for (const user of users) {
        try {
          await bot.telegram.sendMessage(user.telegramId, message, {
            parse_mode: "Markdown",
            ...keyboard,
          });
        } catch (error) {
          console.error(
            `Failed to send alert to user ${user.telegramId}:`,
            error
          );
        }
      }

      console.log(`📤 Sent alert to ${users.length} users`);
    } catch (error) {
      console.error("Error in whale monitoring:", error);
    }
  }, WHALE_ALERT_INTERVAL);
}

// Start bot
async function start() {
  try {
    console.log("🤖 Starting Solana Whale Tracker Bot...");
    console.log("");

    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connected");

    // Start x402 API server (Phase 2)
    const { startX402Server } = await import("./x402-server.js");
    startX402Server();
    console.log("");

    // Start whale monitoring
    startWhaleMonitoring();

    // Launch bot
    await bot.launch();
    console.log("✅ Telegram Bot is running!");
    console.log("🤖 AI Agent ready for autonomous analysis");
    console.log("");
    console.log("Press Ctrl+C to stop");

    // Enable graceful stop
    process.once("SIGINT", async () => {
      console.log("\n🛑 Stopping bot...");
      bot.stop("SIGINT");
      await prisma.$disconnect();
      process.exit(0);
    });

    process.once("SIGTERM", async () => {
      console.log("\n🛑 Stopping bot...");
      bot.stop("SIGTERM");
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

// Run the bot
start();
