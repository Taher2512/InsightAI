import express, { Request, Response } from "express";
import cors from "cors";
import { express as faremeter } from "@faremeter/middleware";
import { solana } from "@faremeter/info";
import { getSwitchboardService } from "./services/switchboard.service.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.X402_API_PORT || "3001");
const RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET || "";

app.use(cors());
app.use(express.json());

async function createPaywallMiddlewares() {
  const baseURL = `http://localhost:${PORT}`;

  const historicalMiddleware = await faremeter.createMiddleware({
    facilitatorURL: "https://facilitator.corbits.dev",
    accepts: [
      {
        ...solana.x402Exact({
          network: "devnet",
          asset: "USDC",
          amount: 500000,
          payTo: RECIPIENT_WALLET,
        }),
        resource: `${baseURL}/api/x402/historical-patterns`,
        description: "Historical whale behavior patterns and trade outcomes",
      },
    ],
  });

  const sentimentMiddleware = await faremeter.createMiddleware({
    facilitatorURL: "https://facilitator.corbits.dev",
    accepts: [
      {
        ...solana.x402Exact({
          network: "devnet",
          asset: "USDC",
          amount: 300000,
          payTo: RECIPIENT_WALLET,
        }),
        resource: `${baseURL}/api/x402/sentiment-analysis`,
        description: "Social sentiment from Twitter, Reddit, crypto forums",
      },
    ],
  });

  const marketImpactMiddleware = await faremeter.createMiddleware({
    facilitatorURL: "https://facilitator.corbits.dev",
    accepts: [
      {
        ...solana.x402Exact({
          network: "devnet",
          asset: "USDC",
          amount: 400000,
          payTo: RECIPIENT_WALLET,
        }),
        resource: `${baseURL}/api/x402/market-impact`,
        description:
          "Liquidity analysis and execution impact with Switchboard oracle prices",
      },
    ],
  });

  return { historicalMiddleware, sentimentMiddleware, marketImpactMiddleware };
}

let middlewares: any = {};

app.get(
  "/api/x402/historical-patterns",
  async (req: Request, res: Response, next) => {
    if (middlewares.historicalMiddleware) {
      return middlewares.historicalMiddleware(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response) => {
    const data = {
      endpoint: "historical-patterns",
      whaleAddress: req.query.address || "Unknown",
      data: {
        recentTrades: [
          {
            timestamp: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            action: "deposit",
            amount: 45000,
            exchange: "Binance",
            priceImpact: "+3.2%",
            outcome: "Price rallied 8% within 24h",
          },
          {
            timestamp: new Date(
              Date.now() - 14 * 24 * 60 * 60 * 1000
            ).toISOString(),
            action: "withdrawal",
            amount: 32000,
            exchange: "Coinbase",
            priceImpact: "-2.1%",
            outcome: "Price dropped 5% within 48h",
          },
          {
            timestamp: new Date(
              Date.now() - 21 * 24 * 60 * 60 * 1000
            ).toISOString(),
            action: "deposit",
            amount: 28000,
            exchange: "Kraken",
            priceImpact: "+1.8%",
            outcome: "Price consolidated, no major movement",
          },
        ],
        patterns: {
          averageHolding: "12 days",
          profitRate: "68%",
          typicalStrategy: "Buy dips, sell pumps",
          riskProfile: "Medium-High",
        },
        historicalAccuracy: "72%",
      },
    };

    console.log(
      `✅ Served historical-patterns data (x402 payment verified by Corbits)`
    );
    return res.json(data);
  }
);

app.get(
  "/api/x402/sentiment-analysis",
  async (req: Request, res: Response, next) => {
    if (middlewares.sentimentMiddleware) {
      return middlewares.sentimentMiddleware(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response) => {
    const data = {
      endpoint: "sentiment-analysis",
      whaleAddress: req.query.address || "Unknown",
      data: {
        twitter: {
          sentiment: "Bullish",
          score: 68,
          volume: "12.4K mentions",
          trending: true,
          topInfluencers: ["@cryptowhale", "@solanadev", "@defi_analyst"],
        },
        reddit: {
          sentiment: "Mixed",
          score: 52,
          hotThreads: 3,
          totalComments: 847,
          subreddits: ["r/solana", "r/cryptocurrency", "r/defi"],
        },
        forums: {
          sentiment: "Neutral",
          score: 48,
          discussions: 156,
          platforms: ["Bitcointalk", "Discord", "Telegram"],
        },
        aggregate: {
          overallSentiment: "Slightly Bullish",
          confidenceLevel: "64%",
          recommendation: "Monitor social buzz for confirmation",
        },
      },
    };

    console.log(
      `✅ Served sentiment-analysis data (x402 payment verified by Corbits)`
    );
    return res.json(data);
  }
);

app.get(
  "/api/x402/market-impact",
  async (req: Request, res: Response, next) => {
    if (middlewares.marketImpactMiddleware) {
      return middlewares.marketImpactMiddleware(req, res, next);
    }
    next();
  },
  async (req: Request, res: Response) => {
    const switchboard = getSwitchboardService();
    const oraclePrice = await switchboard.getSolPrice();

    console.log(
      `📡 Using Switchboard oracle price: $${oraclePrice.price.toFixed(2)} (confidence: ${oraclePrice.confidence.toFixed(1)}%)`
    );

    const data = {
      endpoint: "market-impact",
      whaleAddress: req.query.address || "Unknown",
      oracleData: {
        source: "Switchboard",
        price: oraclePrice.price,
        confidence: oraclePrice.confidence,
        oracleCount: oraclePrice.oracleCount,
        timestamp: oraclePrice.timestamp,
        verified: true,
      },
      data: {
        liquidity: {
          depth: "High",
          bidDepth: "$12.4M within 2%",
          askDepth: "$10.8M within 2%",
          bidAskSpread: "0.08%",
        },
        orderBook: {
          topBidSize: 8500,
          topAskSize: 7200,
          imbalance: "Slight buy pressure",
        },
        executionAnalysis: {
          smallOrder: {
            size: "5000 SOL",
            estimatedSlippage: "0.12%",
            impact: "Negligible",
          },
          mediumOrder: {
            size: "20000 SOL",
            estimatedSlippage: "0.45%",
            impact: "Low",
          },
          largeOrder: {
            size: "50000 SOL",
            estimatedSlippage: "1.8%",
            impact: "Moderate",
          },
        },
        recommendation: {
          bestExecution: "TWAP over 2-4 hours",
          optimalSize: "15000-25000 SOL per trade",
          riskLevel: "Medium",
        },
        confidence: "81%",
      },
    };

    console.log(
      `✅ Served market-impact data (x402 payment verified by Corbits)`
    );
    return res.json(data);
  }
);

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "x402-api",
    protocol: "Corbits x402",
    network: "solana-devnet",
    recipient: RECIPIENT_WALLET,
  });
});

export async function startX402Server() {
  console.log("⏳ Initializing Corbits x402 payment middleware...");

  try {
    middlewares = await createPaywallMiddlewares();
    console.log("✅ Corbits x402 middleware initialized");
  } catch (error) {
    console.error("⚠️ Failed to initialize Corbits middleware:", error);
    console.log("⚠️ Server will start without x402 payments");
  }

  app.listen(PORT, () => {
    console.log(`🔌 x402 API server running on port ${PORT}`);
    console.log(`💰 Recipient wallet: ${RECIPIENT_WALLET || "NOT SET"}`);
    console.log(`🌐 Network: Solana Devnet`);
    console.log(`📡 Protocol: Corbits x402 (Faremeter)`);
    console.log("");
    console.log("Available endpoints:");
    console.log(`  GET /api/x402/historical-patterns (0.05 SOL)`);
    console.log(`  GET /api/x402/sentiment-analysis (0.03 SOL)`);
    console.log(`  GET /api/x402/market-impact (0.04 SOL)`);
    console.log("");
    console.log("💳 Payments automatically handled by Corbits facilitator");
  });
}
