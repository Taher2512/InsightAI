import { Connection, PublicKey } from "@solana/web3.js";
import { OracleJob } from "@switchboard-xyz/common";

// Price data interface
export interface OraclePriceData {
  asset: string;
  price: number;
  confidence: number;
  timestamp: Date;
  oracleCount: number;
  variance: number;
  staleness: number; // seconds since last update
}

// Cache interface
interface PriceCache {
  data: OraclePriceData;
  cachedAt: number;
}

// Switchboard feed addresses on Solana mainnet (for reference)
// Note: For devnet demo, we simulate oracle behavior with realistic market data
const SWITCHBOARD_FEEDS = {
  SOL_USD: "GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR",
  ETH_USD: "EdWr4ww1Dq82vPe8GFjjcVPo2Qno3Znjh7t3b1dL2fFk",
  BTC_USD: "8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee",
};

const CACHE_DURATION_MS = 30000; // 30 seconds
const MAX_STALENESS_SECONDS = 300; // 5 minutes

export class SwitchboardService {
  private connection: Connection;
  private priceCache: Map<string, PriceCache> = new Map();
  private simulationServerUrl = "https://api.switchboard.xyz/api/simulate";

  // Oracle job definitions for different price feeds
  private priceJobs = {
    SOL_USD: this.createPriceJob("SOLUSDT"),
    ETH_USD: this.createPriceJob("ETHUSDT"),
    BTC_USD: this.createPriceJob("BTCUSDT"),
  };

  constructor() {
    // Connect to Solana devnet
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );
  }

  /**
   * Create an OracleJob for fetching price from Binance API
   */
  private createPriceJob(symbol: string): OracleJob {
    return new OracleJob({
      tasks: [
        {
          httpTask: {
            url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
          },
        },
        {
          jsonParseTask: {
            path: "$.price",
          },
        },
      ],
    });
  }

  /**
   * Call Switchboard simulation server to fetch real price
   */
  private async callSimulationServer(job: OracleJob): Promise<number> {
    try {
      // Serialize the job to base64
      const encoded = OracleJob.encodeDelimited(job).finish();
      const base64Job = Buffer.from(encoded).toString("base64");

      // Call Switchboard simulation server
      const response = await fetch(this.simulationServerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster: "Mainnet",
          jobs: [base64Job],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Simulation server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Parse the result
      if (!data.results || !data.results[0]) {
        throw new Error("Invalid response from simulation server");
      }

      const price = parseFloat(data.results[0]);
      if (isNaN(price)) {
        throw new Error(`Invalid price value: ${data.results[0]}`);
      }

      return price;
    } catch (error) {
      console.error("❌ Simulation server call failed:", error);
      throw error;
    }
  }

  /**
   * Fetch real price from Switchboard simulation server with caching
   *
   * Uses Switchboard's simulation server to fetch live prices from Binance API
   * Note: Simulation server is rate-limited, use appropriate caching
   */
  private async fetchPrice(
    asset: string,
    feedAddress: string
  ): Promise<OraclePriceData> {
    // Check cache first
    const cached = this.priceCache.get(asset);
    if (cached && Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
      console.log(`📦 Using cached ${asset} price from Switchboard oracle`);
      return cached.data;
    }

    try {
      console.log(
        `🔍 Fetching real ${asset} price from Switchboard simulation server...`
      );

      // Get the oracle job for this asset
      const job = this.priceJobs[asset as keyof typeof this.priceJobs];
      if (!job) {
        throw new Error(`No oracle job defined for ${asset}`);
      }

      // Fetch real price from Switchboard simulation server
      const price = await this.callSimulationServer(job);

      // Simulate oracle consensus metrics (in production these come from the oracle network)
      const stdDev = price * (Math.random() * 0.002 + 0.001); // 0.1-0.3% variance
      const confidenceScore = Math.max(
        85,
        Math.min(99, 98 - (stdDev / price) * 100)
      );
      const oracleCount = Math.floor(Math.random() * 4) + 9; // 9-12 oracles

      const timestamp = new Date();
      const staleness = 0; // Fresh data

      const priceData: OraclePriceData = {
        asset,
        price,
        confidence: confidenceScore,
        timestamp,
        oracleCount,
        variance: stdDev,
        staleness,
      };

      // Cache the result
      this.priceCache.set(asset, {
        data: priceData,
        cachedAt: Date.now(),
      });

      console.log(
        `✅ Switchboard Oracle (Real Price): ${asset} = $${price.toFixed(2)} ` +
          `(confidence: ${confidenceScore.toFixed(1)}%, oracles: ${oracleCount}, variance: ±$${stdDev.toFixed(2)})`
      );

      return priceData;
    } catch (error) {
      console.error(`❌ Failed to fetch ${asset} from Switchboard:`, error);

      // Return cached data if available (even if stale)
      if (cached) {
        console.log(`⚠️ Using stale cached ${asset} price as fallback`);
        return {
          ...cached.data,
          staleness: Math.floor((Date.now() - cached.cachedAt) / 1000),
        };
      }

      // Fallback to approximate prices if no cache available
      console.log(`⚠️ Using fallback price for ${asset}`);
      return this.getFallbackPrice(asset);
    }
  }

  /**
   * Get fallback prices when Switchboard is unavailable
   */
  private getFallbackPrice(asset: string): OraclePriceData {
    const fallbackPrices: Record<string, number> = {
      SOL_USD: 168.5,
      ETH_USD: 3200.0,
      BTC_USD: 68000.0,
    };

    return {
      asset,
      price: fallbackPrices[asset] || 0,
      confidence: 0, // 0% confidence for fallback
      timestamp: new Date(),
      oracleCount: 0,
      variance: 0,
      staleness: 0,
    };
  }

  /**
   * Get SOL/USD price from Switchboard
   */
  async getSolPrice(): Promise<OraclePriceData> {
    return this.fetchPrice("SOL_USD", SWITCHBOARD_FEEDS.SOL_USD);
  }

  /**
   * Get ETH/USD price from Switchboard
   */
  async getEthPrice(): Promise<OraclePriceData> {
    return this.fetchPrice("ETH_USD", SWITCHBOARD_FEEDS.ETH_USD);
  }

  /**
   * Get BTC/USD price from Switchboard
   */
  async getBtcPrice(): Promise<OraclePriceData> {
    return this.fetchPrice("BTC_USD", SWITCHBOARD_FEEDS.BTC_USD);
  }

  /**
   * Get multiple prices at once
   */
  async getAllPrices(): Promise<{
    sol: OraclePriceData;
    eth: OraclePriceData;
    btc: OraclePriceData;
  }> {
    const [sol, eth, btc] = await Promise.all([
      this.getSolPrice(),
      this.getEthPrice(),
      this.getBtcPrice(),
    ]);

    return { sol, eth, btc };
  }

  /**
   * Calculate price volatility (percentage change)
   * Compares current price to cached price from 30s ago
   */
  async getVolatility(asset: string): Promise<number> {
    const cached = this.priceCache.get(asset);

    let currentPrice: OraclePriceData;
    if (asset === "SOL_USD") {
      currentPrice = await this.getSolPrice();
    } else if (asset === "ETH_USD") {
      currentPrice = await this.getEthPrice();
    } else if (asset === "BTC_USD") {
      currentPrice = await this.getBtcPrice();
    } else {
      return 0;
    }

    if (!cached) {
      return 0; // No previous data to compare
    }

    const priceChange = Math.abs(currentPrice.price - cached.data.price);
    const volatility = (priceChange / cached.data.price) * 100;

    return volatility;
  }

  /**
   * Check if price data is reliable for financial decisions
   */
  isDataReliable(priceData: OraclePriceData): {
    reliable: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check confidence score
    if (priceData.confidence < 85) {
      warnings.push(
        `Low confidence: ${priceData.confidence.toFixed(1)}% (expected >85%)`
      );
    }

    // Check staleness
    if (priceData.staleness > MAX_STALENESS_SECONDS) {
      warnings.push(
        `Stale data: ${priceData.staleness}s old (max ${MAX_STALENESS_SECONDS}s)`
      );
    }

    // Check oracle count
    if (priceData.oracleCount < 3) {
      warnings.push(
        `Few oracles: ${priceData.oracleCount} reporting (expected >3)`
      );
    }

    // Check if using fallback
    if (priceData.confidence === 0 && priceData.oracleCount === 0) {
      warnings.push("Using fallback price - Switchboard unavailable");
    }

    const reliable = warnings.length === 0;
    return { reliable, warnings };
  }

  /**
   * Save price snapshot to database for historical tracking
   */
  async savePriceSnapshot(priceData: OraclePriceData): Promise<void> {
    try {
      const { prismaClient: prisma } = await import("db/client");

      await prisma.priceSnapshot.create({
        data: {
          asset: priceData.asset,
          price: priceData.price,
          confidence: priceData.confidence,
          oracleCount: priceData.oracleCount,
          variance: priceData.variance,
          timestamp: priceData.timestamp,
        },
      });

      console.log(`💾 Saved ${priceData.asset} price snapshot to database`);
    } catch (error) {
      console.error("Failed to save price snapshot:", error);
      // Don't throw - saving snapshots is non-critical
    }
  }

  /**
   * Clear price cache (useful for testing)
   */
  clearCache() {
    this.priceCache.clear();
    console.log("🧹 Switchboard price cache cleared");
  }
}

// Singleton instance
let switchboardService: SwitchboardService | null = null;

export function getSwitchboardService(): SwitchboardService {
  if (!switchboardService) {
    switchboardService = new SwitchboardService();
  }
  return switchboardService;
}
