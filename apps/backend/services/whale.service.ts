import { prismaClient as prisma } from "db/client";

// Mock whale addresses (real Solana addresses for realism)
export const WHALE_ADDRESSES = [
  "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
  "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy",
  "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq",
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
  "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE",
  "3vjSWBPuW5Zq8YxY2KVF4CKKs4kF8vGc8EKG3Q4LXYVk",
  "BEhhFdFbeFnWzaEECvmNjk3YLXmEqAdhXPmLxfWsEXXx",
  "A7HCQRKLjHwDQjhDCH8GVjPq5YPqz7eKK5c9LDKkpump",
];

interface WhaleAlert {
  walletAddress: string;
  amount: number;
  token: string;
  actionType: "deposit" | "withdrawal";
  exchange: string;
  timestamp: Date;
}

/**
 * Generates a random whale alert
 */
function generateRandomAlert(): WhaleAlert {
  const address =
    WHALE_ADDRESSES[Math.floor(Math.random() * WHALE_ADDRESSES.length)]!;
  const amount = Math.floor(Math.random() * 49000) + 1000; // Random 1000-50000
  const actionType = Math.random() > 0.5 ? "deposit" : "withdrawal";
  const exchanges = ["Binance", "Coinbase", "Kraken", "OKX", "Bybit"];
  const exchange = exchanges[Math.floor(Math.random() * exchanges.length)]!;

  return {
    walletAddress: address,
    amount,
    token: "SOL",
    actionType,
    exchange,
    timestamp: new Date(),
  };
}

/**
 * Creates a whale alert in the database
 */
export async function createWhaleAlert(alert: WhaleAlert) {
  try {
    const whaleAlert = await prisma.whaleAlert.create({
      data: {
        walletAddress: alert.walletAddress,
        amount: alert.amount,
        token: alert.token,
        actionType: alert.actionType,
        exchange: alert.exchange,
        timestamp: alert.timestamp,
      },
    });

    console.log(
      `🐋 Created whale alert: ${alert.actionType} ${alert.amount} ${alert.token}`
    );
    return whaleAlert;
  } catch (error) {
    console.error("Error creating whale alert:", error);
    throw error;
  }
}

/**
 * Generates and stores a random whale alert
 */
export async function generateMockWhaleAlert() {
  const alert = generateRandomAlert();
  return await createWhaleAlert(alert);
}

/**
 * Gets recent whale alerts
 */
export async function getRecentAlerts(limit: number = 10) {
  try {
    return await prisma.whaleAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (error) {
    console.error("Error getting recent alerts:", error);
    throw error;
  }
}

/**
 * Gets tracked whale addresses
 */
export function getTrackedWhales() {
  return WHALE_ADDRESSES;
}

/**
 * Marks an alert as analyzed
 */
export async function markAlertAnalyzed(alertId: string, userId: string) {
  try {
    // Update alert
    await prisma.whaleAlert.update({
      where: { id: alertId },
      data: { analyzed: true },
    });

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: {
        whaleAlertId: alertId,
        userId,
        cost: 0.15,
        report: null, // Will be populated in Phase 2
      },
    });

    return analysis;
  } catch (error) {
    console.error("Error marking alert as analyzed:", error);
    throw error;
  }
}
