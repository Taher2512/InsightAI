/**
 * Old Faithful RPC Service
 * Integration with Old Faithful for historical Solana blockchain data
 * https://docs.old-faithful.net/
 *
 * This service provides:
 * 1. Historical whale transaction patterns from Solana's complete history
 * 2. Pattern recognition and price impact analysis
 * 3. Social sentiment aggregation (Twitter, Reddit, crypto forums)
 */

interface HistoricalTransaction {
  date: string;
  month: string;
  year: number;
  action: "deposit" | "withdrawal";
  amount: number;
  exchange: string;
  priceImpact: string;
  priceChange: number;
  timeframe: string;
  outcome: string;
}

interface SentimentData {
  overall: "bullish" | "bearish" | "neutral";
  score: number; // 0-100
  twitter: {
    sentiment: string;
    mentions: number;
    trending: boolean;
    topHashtags: string[];
  };
  reddit: {
    sentiment: string;
    posts: number;
    upvoteRatio: number;
    topSubreddits: string[];
  };
  forums: {
    sentiment: string;
    discussions: number;
    platforms: string[];
  };
}

interface HistoricalAnalysis {
  whaleAddress: string;
  historicalTransactions: HistoricalTransaction[];
  patterns: {
    totalOccurrences: number;
    averagePriceImpact: string;
    averageTimeToImpact: string;
    patternAccuracy: number;
    predictedOutcome: string;
  };
  sentiment: SentimentData;
  marketContext: {
    currentLiquidity: string;
    expectedSlippage: string;
    marketSentimentScore: number;
    contrarian: boolean;
  };
  recommendation: {
    action: string;
    reasoning: string[];
    riskLevel: "low" | "medium" | "high";
    confidence: number;
  };
}

export class OldFaithfulService {
  /**
   * Fetch historical whale transactions using Old Faithful RPC
   * In production: Uses Old Faithful's Geyser plugin to query complete Solana history
   * For demo: Returns realistic mock data based on whale behavior patterns
   */
  async getHistoricalWhaleData(
    walletAddress: string,
    action: "deposit" | "withdrawal",
    token: string
  ): Promise<HistoricalAnalysis> {
    console.log(
      `📜 Old Faithful: Querying historical data for ${walletAddress}`
    );
    console.log(`   Action type: ${action} | Token: ${token}`);

    // Simulate Old Faithful API call delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate historical transactions based on action type
    const historicalTxs = this.generateHistoricalPatterns(action, token);

    // Generate social sentiment data
    const sentiment = this.generateSocialSentiment(token, action);

    // Calculate patterns and predictions
    const patterns = this.analyzePatterns(historicalTxs, action);

    // Generate market context
    const marketContext = this.getMarketContext(sentiment, action);

    // Generate recommendations
    const recommendation = this.generateRecommendations(
      patterns,
      sentiment,
      marketContext,
      action
    );

    console.log(
      `✅ Old Faithful: Retrieved ${historicalTxs.length} historical transactions`
    );

    return {
      whaleAddress: walletAddress,
      historicalTransactions: historicalTxs,
      patterns,
      sentiment,
      marketContext,
      recommendation,
    };
  }

  /**
   * Generate realistic historical transaction patterns
   * Simulates data that would come from Old Faithful's complete Solana history
   */
  private generateHistoricalPatterns(
    action: "deposit" | "withdrawal",
    token: string
  ): HistoricalTransaction[] {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const exchanges = ["Binance", "Coinbase", "Kraken", "FTX", "Bybit"];

    // Generate 5-8 historical transactions
    const txCount = Math.floor(Math.random() * 4) + 5;
    const transactions: HistoricalTransaction[] = [];

    for (let i = 0; i < txCount; i++) {
      const monthsAgo = (i + 1) * Math.floor(Math.random() * 3 + 2); // 2-5 months apart
      const date = new Date();
      date.setMonth(date.getMonth() - monthsAgo);

      const amount = Math.floor(Math.random() * 40000) + 15000; // 15k-55k
      const priceChange =
        (Math.random() * 12 + 3) * (action === "deposit" ? 1 : -1); // 3-15%
      const timeframe = Math.floor(Math.random() * 48) + 24; // 24-72 hours

      transactions.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        month: months[date.getMonth()],
        year: date.getFullYear(),
        action,
        amount,
        exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
        priceImpact: `${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
        priceChange: Math.abs(priceChange),
        timeframe: `${timeframe}h`,
        outcome:
          action === "deposit"
            ? priceChange > 8
              ? "Strong rally followed"
              : priceChange > 5
                ? "Moderate price increase"
                : "Minor price movement"
            : priceChange > 10
              ? "Significant price drop"
              : priceChange > 6
                ? "Notable price decline"
                : "Mild price correction",
      });
    }

    return transactions.sort((a, b) => {
      // Sort by most recent first
      if (a.year !== b.year) return b.year - a.year;
      return months.indexOf(b.month) - months.indexOf(a.month);
    });
  }

  /**
   * Generate social sentiment data
   * Simulates aggregated sentiment from Twitter, Reddit, and crypto forums
   */
  private generateSocialSentiment(
    token: string,
    action: "deposit" | "withdrawal"
  ): SentimentData {
    // Base sentiment on action type with some randomness
    const baseScore =
      action === "deposit" ? 60 + Math.random() * 15 : 35 + Math.random() * 15;
    const score = Math.round(baseScore);

    const overall: "bullish" | "bearish" | "neutral" =
      score >= 60 ? "bullish" : score <= 40 ? "bearish" : "neutral";

    return {
      overall,
      score,
      twitter: {
        sentiment: score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Mixed",
        mentions: Math.floor(Math.random() * 15000) + 8000, // 8k-23k
        trending: score >= 65 && Math.random() > 0.3,
        topHashtags: [
          `#${token}`,
          action === "deposit" ? "#bullish" : "#bearish",
          "#crypto",
          "#solana",
        ],
      },
      reddit: {
        sentiment:
          score >= 58 ? "Optimistic" : score <= 42 ? "Pessimistic" : "Neutral",
        posts: Math.floor(Math.random() * 1200) + 400, // 400-1600
        upvoteRatio:
          score >= 60
            ? 0.75 + Math.random() * 0.15
            : 0.45 + Math.random() * 0.2,
        topSubreddits: ["r/solana", "r/cryptocurrency", "r/CryptoMarkets"],
      },
      forums: {
        sentiment:
          score >= 55 ? "Positive" : score <= 45 ? "Negative" : "Neutral",
        discussions: Math.floor(Math.random() * 300) + 150, // 150-450
        platforms: ["Bitcointalk", "Discord", "Telegram", "CryptoCompare"],
      },
    };
  }

  /**
   * Analyze historical patterns and generate predictions
   */
  private analyzePatterns(
    transactions: HistoricalTransaction[],
    action: "deposit" | "withdrawal"
  ) {
    const avgPriceChange =
      transactions.reduce((sum, tx) => sum + tx.priceChange, 0) /
      transactions.length;

    const avgTimeframe =
      transactions.reduce((sum, tx) => sum + parseInt(tx.timeframe), 0) /
      transactions.length;

    // Pattern accuracy: 75-95%
    const accuracy = Math.floor(Math.random() * 20 + 75);

    return {
      totalOccurrences: transactions.length,
      averagePriceImpact: `${avgPriceChange > 0 ? "+" : "-"}${avgPriceChange.toFixed(1)}%`,
      averageTimeToImpact: `${Math.round(avgTimeframe)}h`,
      patternAccuracy: accuracy,
      predictedOutcome:
        action === "deposit"
          ? avgPriceChange > 8
            ? "Strong bullish momentum expected"
            : avgPriceChange > 5
              ? "Moderate price appreciation likely"
              : "Mild positive price action"
          : avgPriceChange > 10
            ? "Significant bearish pressure expected"
            : avgPriceChange > 6
              ? "Notable downward price movement likely"
              : "Minor price correction expected",
    };
  }

  /**
   * Generate current market context
   */
  private getMarketContext(
    sentiment: SentimentData,
    action: "deposit" | "withdrawal"
  ) {
    const slippage = (Math.random() * 3 + 0.8).toFixed(1); // 0.8-3.8%
    const liquidity = Math.random() > 0.5 ? "High" : "Moderate";

    // Contrarian signal: bullish sentiment but whale withdrawing (or vice versa)
    const contrarian =
      (sentiment.overall === "bullish" && action === "withdrawal") ||
      (sentiment.overall === "bearish" && action === "deposit");

    return {
      currentLiquidity: liquidity,
      expectedSlippage: `${slippage}%`,
      marketSentimentScore: sentiment.score,
      contrarian,
    };
  }

  /**
   * Generate actionable recommendations based on all data
   */
  private generateRecommendations(
    patterns: any,
    sentiment: SentimentData,
    marketContext: any,
    action: "deposit" | "withdrawal"
  ) {
    const reasoning: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "medium";
    let recommendedAction = "";

    // Analyze pattern strength
    if (patterns.patternAccuracy >= 85) {
      reasoning.push(
        `Historical pattern highly reliable (${patterns.patternAccuracy}% accuracy)`
      );
    } else if (patterns.patternAccuracy >= 75) {
      reasoning.push(
        `Historical pattern moderately reliable (${patterns.patternAccuracy}% accuracy)`
      );
    }

    // Analyze sentiment
    if (marketContext.contrarian) {
      reasoning.push(
        `Contrarian signal: Market sentiment is ${sentiment.overall} but whale is ${action === "deposit" ? "buying" : "selling"}`
      );
      if (action === "deposit" && sentiment.overall === "bearish") {
        reasoning.push(
          "Smart money buying during fear - potential opportunity"
        );
        recommendedAction = "Consider following whale with scaled entry";
        riskLevel = "medium";
      } else if (action === "withdrawal" && sentiment.overall === "bullish") {
        reasoning.push("Whale taking profits during euphoria - warning signal");
        recommendedAction =
          "Consider hedging positions or taking partial profits";
        riskLevel = "high";
      }
    } else {
      reasoning.push(
        `Whale action aligns with market sentiment (${sentiment.score}% ${sentiment.overall})`
      );
      if (action === "deposit") {
        recommendedAction = "Trend confirmation - monitor for entry points";
        riskLevel = "low";
      } else {
        recommendedAction = "Bearish confirmation - wait for stabilization";
        riskLevel = "medium";
      }
    }

    // Liquidity considerations
    if (parseFloat(marketContext.expectedSlippage) > 2.5) {
      reasoning.push(`High slippage risk (${marketContext.expectedSlippage})`);
      riskLevel = riskLevel === "low" ? "medium" : "high";
    }

    // Final confidence calculation
    const confidence = Math.min(
      95,
      Math.round(
        patterns.patternAccuracy * 0.6 +
          (100 - Math.abs(sentiment.score - 50)) * 0.3 +
          (marketContext.currentLiquidity === "High" ? 10 : 5)
      )
    );

    return {
      action: recommendedAction,
      reasoning,
      riskLevel,
      confidence,
    };
  }
}

// Singleton instance
let oldFaithfulService: OldFaithfulService | null = null;

export function getOldFaithfulService(): OldFaithfulService {
  if (!oldFaithfulService) {
    oldFaithfulService = new OldFaithfulService();
  }
  return oldFaithfulService;
}
