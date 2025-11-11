import { GoogleGenAI } from "@google/genai";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { prismaClient as prisma } from "db/client";
import { decryptPrivateKey } from "../utils/crypto.js";
import { getKeypairFromPrivateKey } from "../utils/solana.js";
import {
  getSwitchboardService,
  OraclePriceData,
} from "./switchboard.service.js";
import { createPaymentHandler } from "@faremeter/payment-solana/exact";
import { wrap as wrapFetch } from "@faremeter/fetch";
import { lookupKnownSPLToken } from "@faremeter/info/solana";
import bs58 from "bs58";

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // More reliable free tier
const SOLANA_RPC =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const X402_API_BASE = `http://localhost:${process.env.X402_API_PORT || 3001}/api/x402`;
const AGENT_SERVICE_FEE = parseFloat(process.env.AGENT_SERVICE_FEE || "0.02");
const SECRET_KEY = process.env.SECRET_KEY || "";
const USDC_MINT = new PublicKey(
  process.env.DEVNET_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
const USDC_DECIMALS = 6; // USDC has 6 decimals

interface APIOption {
  endpoint: string;
  price: number;
  description: string;
  value: "high" | "medium" | "low";
}

interface AnalysisReport {
  executiveSummary: string;
  oldFaithfulAnalysis?: any; // Old Faithful historical analysis
  patterns?: any;
  sentiment?: any;
  marketImpact?: any;
  recommendations: string[];
  riskScore: number;
  confidenceScore: number;
  tradingSignals: string[];
  oracleData?: {
    asset: string;
    price: number;
    confidence: number;
    oracleCount: number;
    usdImpact: number;
    timestamp: Date;
  };
  costBreakdown: {
    apisUsed: string[];
    costPerAPI: { [key: string]: number };
    totalAPIcost: number;
    agentFee: number;
    totalCharged: number;
  };
}

export class WhaleAnalysisAgent {
  private ai: GoogleGenAI;
  private userId: string;
  private userWallet: any;
  private whaleAlert: any;
  private connection: Connection;
  private logs: string[] = [];
  private switchboard = getSwitchboardService();
  private oraclePrice: OraclePriceData | null = null;

  constructor(userId: string, userWallet: any, whaleAlert: any) {
    if (!GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not set");
    }

    this.ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    this.userId = userId;
    this.userWallet = userWallet;
    this.whaleAlert = whaleAlert;
    this.connection = new Connection(SOLANA_RPC, "confirmed");
  }

  private log(message: string) {
    console.log(`🤖 Agent: ${message}`);
    this.logs.push(message);
  }

  // Phase 1: Web Scraping & Context Gathering (NOW WITH SWITCHBOARD ORACLE)
  async gatherContext(): Promise<string> {
    this.log("Phase 1: Querying Switchboard oracle & gathering context...");

    // STEP 1: Get oracle-verified SOL price
    try {
      this.oraclePrice = await this.switchboard.getSolPrice();
      const usdImpact = this.whaleAlert.amount * this.oraclePrice.price;

      this.log(
        `📊 Switchboard Oracle: SOL = $${this.oraclePrice.price.toFixed(2)} ` +
          `(confidence: ${this.oraclePrice.confidence.toFixed(1)}%, oracles: ${this.oraclePrice.oracleCount})`
      );
      this.log(`💰 Whale movement USD value: $${usdImpact.toLocaleString()}`);

      // Save oracle price snapshot
      await this.switchboard.savePriceSnapshot(this.oraclePrice);
    } catch (error) {
      this.log(`⚠️ Oracle query failed: ${error}, using fallback`);
    }

    // STEP 2: Calculate volatility to determine analysis priority
    const volatility = await this.switchboard.getVolatility("SOL_USD");
    const priority =
      volatility > 5 ? "HIGH PRIORITY" : volatility > 2 ? "MEDIUM" : "ROUTINE";

    this.log(
      `📈 SOL volatility: ${volatility.toFixed(2)}% - Marked as ${priority}`
    );

    // STEP 3: Use AI to analyze with oracle context
    const prompt = `You are a crypto whale analyst with access to real-time oracle data. Analyze this whale movement:
    
Whale Address: ${this.whaleAlert.walletAddress}
Action: ${this.whaleAlert.actionType}
Amount: ${this.whaleAlert.amount} SOL
Exchange: ${this.whaleAlert.exchange}
Time: ${this.whaleAlert.timestamp}

ORACLE DATA (Switchboard, ${this.oraclePrice?.oracleCount || 0} nodes):
- Current SOL Price: $${this.oraclePrice?.price.toFixed(2) || "N/A"}
- Oracle Confidence: ${this.oraclePrice?.confidence.toFixed(1) || "N/A"}%
- USD Impact: $${this.oraclePrice ? (this.whaleAlert.amount * this.oraclePrice.price).toLocaleString() : "N/A"}
- Price Volatility: ${volatility.toFixed(2)}%
- Analysis Priority: ${priority}

Provide in 2-3 sentences:
1. Significance of this movement (use oracle-verified USD value)
2. What this signals based on current volatility
3. Key risks/opportunities

Keep it factual and reference oracle data for credibility.`;

    try {
      const result = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const context = result.text || "";

      this.log(`✅ Analysis context ready (with oracle verification)`);
      return context;
    } catch (error) {
      this.log(`⚠️ Error gathering context: ${error}`);
      return "Unable to gather real-time context. Proceeding with historical data.";
    }
  }

  // Phase 2: Autonomous Decision Making (WITH ORACLE-BASED COST-BENEFIT ANALYSIS)
  async decideAPIsToCall(
    context: string,
    userBalance: number
  ): Promise<APIOption[]> {
    this.log(
      "Phase 2: Oracle-informed cost-benefit analysis for API purchases..."
    );

    const availableAPIs: APIOption[] = [
      {
        endpoint: "old-faithful-analysis",
        price: 0.0014, // 0.0014 USDC (~$0.0014)
        description: "Complete Solana history analysis via Old Faithful RPC",
        value: "high",
      },
      {
        endpoint: "historical-patterns",
        price: 0.0013, // 0.0013 USDC (~$0.0013)
        description: "Historical whale behavior patterns and outcomes",
        value: "high",
      },
      {
        endpoint: "sentiment-analysis",
        price: 0.0012, // 0.0012 USDC (~$0.0012)
        description: "Social sentiment from Twitter, Reddit, crypto forums",
        value: "medium",
      },
      {
        endpoint: "market-impact",
        price: 0.0012, // 0.0012 USDC (~$0.0012)
        description: "Liquidity analysis and execution impact",
        value: "medium",
      },
    ];

    // Calculate USD impact using oracle data
    const usdImpact = this.oraclePrice
      ? this.whaleAlert.amount * this.oraclePrice.price
      : 0;

    const volatility = await this.switchboard.getVolatility("SOL_USD");
    const oracleReliable = this.oraclePrice
      ? this.switchboard.isDataReliable(this.oraclePrice).reliable
      : false;

    this.log(`💰 User balance: ${userBalance.toFixed(4)} USDC`);
    this.log(
      `📊 Oracle-verified impact: $${usdImpact.toLocaleString()} ` +
        `(confidence: ${this.oraclePrice?.confidence.toFixed(1) || "N/A"}%)`
    );

    // AUTONOMOUS DECISION LOGIC based on oracle data:
    // - If USD impact > $1M AND high volatility: Buy all 4 APIs (high stakes)
    // - If USD impact > $500K: Buy at least 2-3 APIs including old-faithful-analysis
    // - If oracle confidence < 90%: Be more conservative, prioritize old-faithful + historical
    // - If low volatility (<2%): old-faithful-analysis sufficient (most comprehensive)
    // - ALWAYS prefer old-faithful-analysis as it provides the best historical context

    const prompt = `You are an autonomous AI agent with FINANCIAL DECISION-MAKING power. You must decide which premium data APIs to purchase using USDC.

ORACLE-VERIFIED DATA (Switchboard, ${this.oraclePrice?.oracleCount || 0} nodes):
- SOL Price: $${this.oraclePrice?.price.toFixed(2) || "N/A"}
- Oracle Confidence: ${this.oraclePrice?.confidence.toFixed(1) || "N/A"}%
- Oracle Reliable: ${oracleReliable ? "YES" : "NO"}
- USD Impact: $${usdImpact.toLocaleString()}
- Price Volatility: ${volatility.toFixed(2)}%

Whale Action: ${this.whaleAlert.actionType} ${this.whaleAlert.amount} SOL on ${this.whaleAlert.exchange}

Context: ${context}

Available Budget: ${userBalance.toFixed(4)} USDC (must keep 0.1 USDC for tx fees)

Available APIs:
1. old-faithful-analysis (0.0014 USDC) - Complete Solana history analysis via Old Faithful RPC [HIGH VALUE - RECOMMENDED]
2. historical-patterns (0.0013 USDC) - Past whale behavior & outcomes
3. sentiment-analysis (0.0012 USDC) - Social sentiment data  
4. market-impact (0.0012 USDC) - Liquidity & execution analysis

DECISION GUIDELINES (based on oracle data):
- USD Impact > $1M + Volatility > 5%: Consider all 4 APIs (high stakes)
- USD Impact > $500K: At least 2-3 APIs recommended, MUST include old-faithful-analysis
- USD Impact < $100K: 1-2 APIs sufficient (old-faithful-analysis + one other)
- Oracle Confidence < 90%: Be conservative, prioritize old-faithful-analysis + historical-patterns
- High Volatility (>5%): old-faithful-analysis + sentiment-analysis + market-impact more valuable
- Low Volatility (<2%): old-faithful-analysis sufficient (most comprehensive)
- ALWAYS prioritize old-faithful-analysis - it provides the most comprehensive historical context

RULES:
- You can purchase 0, 1, 2, 3, or all 4 APIs
- Total cost must be <= ${(userBalance - 0.1).toFixed(4)} USDC
- Choose based on VALUE for this specific whale action
- USE ORACLE DATA to justify spending more/less USDC
- Explain how oracle confidence influenced your decision
- STRONGLY PREFER old-faithful-analysis as it provides the best historical context

Respond with JSON only:
{
  "apis": ["endpoint1", "endpoint2"],
  "reasoning": "Brief explanation of why you chose these specific APIs",
  "totalCost": 1.1
}`;

    try {
      const result = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const response = result.text || "";

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.log(
          "⚠️ Agent decision unclear, using default: old-faithful-analysis only"
        );
        return [availableAPIs[0]!]; // old-faithful-analysis is first in array
      }

      const decision = JSON.parse(jsonMatch[0]);
      const selectedAPIs = availableAPIs.filter((api) =>
        decision.apis.includes(api.endpoint)
      );

      this.log(`🧠 Agent Decision: ${decision.reasoning}`);
      this.log(
        `📊 Selected APIs: ${selectedAPIs.map((api) => api.endpoint).join(", ")}`
      );
      this.log(`💵 Total Cost: ${decision.totalCost} USDC`);

      return selectedAPIs;
    } catch (error) {
      this.log(
        `⚠️ Decision error: ${error}. Defaulting to old-faithful-analysis.`
      );
      return [availableAPIs[0]!]; // old-faithful-analysis is first in array
    }
  }

  // Phase 3: Autonomous Payment (x402-ready, manual USDC for ngrok compatibility)
  async purchaseAPI(api: APIOption): Promise<any> {
    this.log(`Phase 3: Purchasing ${api.endpoint} for ${api.price} USDC...`);

    try {
      // Decrypt user's private key
      const privateKey = decryptPrivateKey(
        this.userWallet.encryptedPrivateKey,
        SECRET_KEY
      );
      const keypair = getKeypairFromPrivateKey(privateKey);

      this.log(`💸 Processing USDC payment of ${api.price} USDC...`);

      // Manual USDC transfer (Corbits blocked by ngrok browser warning)
      // For production deployment, switch to Corbits x402 protocol
      const recipientWallet = process.env.X402_RECIPIENT_WALLET;
      if (!recipientWallet) {
        throw new Error("X402_RECIPIENT_WALLET not configured");
      }

      // Import spl-token functions
      const { getOrCreateAssociatedTokenAccount, transfer } = await import(
        "@solana/spl-token"
      );
      const USDC_MINT = new PublicKey(
        process.env.DEVNET_USDC_MINT ||
          "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
      );

      // Get user's USDC token account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        keypair,
        USDC_MINT,
        keypair.publicKey
      );

      // Get recipient's USDC token account
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        keypair,
        USDC_MINT,
        new PublicKey(recipientWallet)
      );

      // Convert USDC amount to base units (6 decimals)
      const usdcAmount = Math.round(api.price * Math.pow(10, 6));

      // Transfer USDC tokens
      const signature = await transfer(
        this.connection,
        keypair,
        userTokenAccount.address,
        recipientTokenAccount.address,
        keypair.publicKey,
        usdcAmount
      );

      this.log(`� USDC payment sent: ${signature}`);
      await this.connection.confirmTransaction(signature);
      this.log(`✅ Payment confirmed!`);

      // Now call the API
      this.log(`📞 Calling ${api.endpoint}...`);
      // Add action and token parameters for Old Faithful
      const queryParams = new URLSearchParams({
        address: this.whaleAlert.walletAddress,
        action: this.whaleAlert.actionType,
        token: this.whaleAlert.token || "SOL",
      });
      const url = `${X402_API_BASE}/${api.endpoint}?${queryParams}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420",
        },
      });

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      this.log(`✅ Received data from ${api.endpoint}`);

      // Use actual USDC transaction signature
      this.log(`✅ USDC payment completed: ${signature}`);

      // Record USDC payment in database
      await prisma.x402Payment.create({
        data: {
          userId: this.userId,
          endpoint: api.endpoint,
          amount: api.price,
          signature: signature, // USDC transfer transaction signature
          status: "verified",
          metadata: {
            description: api.description,
            whaleAlertId: this.whaleAlert.id,
            paymentMethod: "manual-usdc-transfer",
            currency: "USDC",
            note: "Corbits x402 blocked by ngrok - using manual transfer",
          },
          switchboardPrice: this.oraclePrice?.price,
          switchboardConfidence: this.oraclePrice?.confidence,
          priceTimestamp: this.oraclePrice?.timestamp,
        },
      });

      return data;
    } catch (error) {
      this.log(`❌ Error purchasing ${api.endpoint}: ${error}`);
      throw error;
    }
  }

  // Phase 4: Synthesis (WITH ORACLE VERIFICATION BADGE)
  async synthesizeReport(
    context: string,
    apiData: { [key: string]: any },
    selectedAPIs: APIOption[]
  ): Promise<AnalysisReport> {
    this.log("Phase 4: Synthesizing oracle-verified analysis report...");

    const totalAPIcost = selectedAPIs.reduce((sum, api) => sum + api.price, 0);
    const totalCharged = totalAPIcost + AGENT_SERVICE_FEE;

    const usdImpact = this.oraclePrice
      ? this.whaleAlert.amount * this.oraclePrice.price
      : 0;

    const prompt = `You are an expert crypto analyst with access to ORACLE-VERIFIED DATA. Synthesize a comprehensive whale transaction analysis.

WHALE TRANSACTION:
- Address: ${this.whaleAlert.walletAddress}
- Action: ${this.whaleAlert.actionType}
- Amount: ${this.whaleAlert.amount} SOL
- Exchange: ${this.whaleAlert.exchange}
- Time: ${this.whaleAlert.timestamp}

SWITCHBOARD ORACLE DATA (Decentralized, Verified):
- SOL Price: $${this.oraclePrice?.price.toFixed(2) || "N/A"}
- Oracle Confidence: ${this.oraclePrice?.confidence.toFixed(1) || "N/A"}%
- Oracle Nodes: ${this.oraclePrice?.oracleCount || 0}
- USD Impact: $${usdImpact.toLocaleString()}
- Data Age: ${this.oraclePrice?.staleness || 0}s
- Status: ${this.oraclePrice ? "✅ VERIFIED ON-CHAIN" : "⚠️ UNVERIFIED"}

PUBLIC CONTEXT:
${context}

PREMIUM DATA PURCHASED:
${JSON.stringify(apiData, null, 2)}

${
  apiData["old-faithful-analysis"]
    ? `
OLD FAITHFUL HISTORICAL ANALYSIS (Complete Solana History):
This whale has performed ${apiData["old-faithful-analysis"].data.patterns.totalOccurrences} similar transactions historically.
Pattern accuracy: ${apiData["old-faithful-analysis"].data.patterns.patternAccuracy}%
Average impact: ${apiData["old-faithful-analysis"].data.patterns.averagePriceImpact}
Social sentiment: ${apiData["old-faithful-analysis"].data.sentiment.overall} (${apiData["old-faithful-analysis"].data.sentiment.score}%)
`
    : ""
}

Provide a JSON analysis with:
{
  "executiveSummary": "2-3 sentence overview referencing oracle-verified USD impact, historical patterns, and sentiment data",
  "recommendations": ["Action 1", "Action 2", "Action 3"],
  "riskScore": 0-10,
  "confidenceScore": 0-100,
  "tradingSignals": ["SIGNAL 1", "SIGNAL 2"]
}

IMPORTANT: Reference the oracle data and Old Faithful historical patterns to show data is trustworthy. Explain why ${usdImpact > 1000000 ? "this large" : "this"} USD movement matters based on historical precedent.`;

    try {
      const result = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const response = result.text || "";

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format");
      }

      const analysis = JSON.parse(jsonMatch[0]);

      const report: AnalysisReport = {
        ...analysis,
        oldFaithfulAnalysis: apiData["old-faithful-analysis"]?.data,
        patterns: apiData["historical-patterns"]?.data,
        sentiment: apiData["sentiment-analysis"]?.data,
        marketImpact: apiData["market-impact"]?.data,
        oracleData: this.oraclePrice
          ? {
              asset: this.oraclePrice.asset,
              price: this.oraclePrice.price,
              confidence: this.oraclePrice.confidence,
              oracleCount: this.oraclePrice.oracleCount,
              usdImpact: this.whaleAlert.amount * this.oraclePrice.price,
              timestamp: this.oraclePrice.timestamp,
            }
          : undefined,
        costBreakdown: {
          apisUsed: selectedAPIs.map((api) => api.endpoint),
          costPerAPI: Object.fromEntries(
            selectedAPIs.map((api) => [api.endpoint, api.price])
          ),
          totalAPIcost,
          agentFee: AGENT_SERVICE_FEE,
          totalCharged,
        },
      };

      this.log("✅ Analysis complete with oracle verification!");
      return report;
    } catch (error: any) {
      // Check if it's a quota error
      const isQuotaError =
        error?.message?.includes("quota") ||
        error?.message?.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        this.log(`⚠️ Gemini API quota exceeded. Using fallback analysis.`);
      } else {
        this.log(`⚠️ Synthesis error: ${error}. Generating basic report.`);
      }

      return {
        executiveSummary: `Whale ${this.whaleAlert.actionType} of ${this.whaleAlert.amount} SOL (${this.oraclePrice ? `$${(this.whaleAlert.amount * this.oraclePrice.price).toLocaleString()} USD verified by Switchboard oracle` : "USD value unavailable"}) detected. Analysis based on available data suggests ${this.whaleAlert.actionType === "deposit" ? "potential bullish" : "potential bearish"} signal.${isQuotaError ? " [AI analysis temporarily unavailable due to API quota limits - using basic analysis]" : ""}`,
        recommendations: [
          "Monitor for follow-up whale activity",
          "Check order book depth before trading",
          "Set appropriate stop losses",
        ],
        riskScore: 6,
        confidenceScore: 65,
        tradingSignals: ["WATCH", "WAIT_FOR_CONFIRMATION"],
        oracleData: this.oraclePrice
          ? {
              asset: this.oraclePrice.asset,
              price: this.oraclePrice.price,
              confidence: this.oraclePrice.confidence,
              oracleCount: this.oraclePrice.oracleCount,
              usdImpact: this.whaleAlert.amount * this.oraclePrice.price,
              timestamp: this.oraclePrice.timestamp,
            }
          : undefined,
        costBreakdown: {
          apisUsed: selectedAPIs.map((api) => api.endpoint),
          costPerAPI: Object.fromEntries(
            selectedAPIs.map((api) => [api.endpoint, api.price])
          ),
          totalAPIcost,
          agentFee: AGENT_SERVICE_FEE,
          totalCharged,
        },
      };
    }
  }

  // Main execution method
  async analyze(): Promise<{ report: AnalysisReport; logs: string[] }> {
    try {
      this.log("🚀 Starting autonomous whale analysis...");

      // Phase 1: Gather Context
      const context = await this.gatherContext();

      // Phase 2: Decide which APIs to call
      const userBalance = this.userWallet.balance;
      const selectedAPIs = await this.decideAPIsToCall(context, userBalance);

      if (selectedAPIs.length === 0) {
        this.log("⚠️ No APIs selected (insufficient balance or low value)");
      }

      // Phase 3: Purchase and collect data
      const apiData: { [key: string]: any } = {};
      for (const api of selectedAPIs) {
        try {
          const data = await this.purchaseAPI(api);
          apiData[api.endpoint] = data;
        } catch (error) {
          this.log(
            `⚠️ Failed to purchase ${api.endpoint}, continuing without it`
          );
        }
      }

      // Phase 4: Synthesize Report
      const report = await this.synthesizeReport(
        context,
        apiData,
        selectedAPIs
      );

      this.log(
        `💰 Total spent: ${report.costBreakdown.totalAPIcost.toFixed(4)} USDC`
      );
      this.log(
        `💵 Agent fee: ${report.costBreakdown.agentFee.toFixed(4)} USDC`
      );
      this.log(
        `💸 Total charged: ${report.costBreakdown.totalCharged.toFixed(4)} USDC`
      );
      this.log("🎉 Analysis complete!");

      return { report, logs: this.logs };
    } catch (error) {
      this.log(`❌ Critical error: ${error}`);
      throw error;
    }
  }
}
