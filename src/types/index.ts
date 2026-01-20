/**
 * Core type definitions for the Polymarket copy-trading bot
 */

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED'
}

export enum ExecutionMode {
  LIVE = 'LIVE',
  TEST = 'TEST'
}

export interface Market {
  id: string;
  question: string;
  outcomes: string[];
  active: boolean;
  endDate?: Date;
}

export interface Outcome {
  marketId: string;
  outcomeId: string;
  name: string;
  price: number;
  lastUpdated: Date;
}

export interface Trade {
  id: string;
  traderAddress: string;
  marketId: string;
  outcomeId: string;
  side: OrderSide;
  size: number;
  price: number;
  timestamp: Date;
  transactionHash?: string;
}

export interface Position {
  id: string;
  marketId: string;
  outcomeId: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  lastUpdated: Date;
}

export interface ExecutionOrder {
  id: string;
  originalTradeId: string;
  traderAddress: string;
  marketId: string;
  outcomeId: string;
  side: OrderSide;
  requestedSize: number;
  executedSize: number;
  requestedPrice: number;
  executedPrice: number;
  status: OrderStatus;
  rejectionReason?: string;
  timestamp: Date;
  executionTimestamp?: Date;
  mode: ExecutionMode;
}

export interface WalletBalance {
  totalBalance: number;
  availableBalance: number;
  positionsValue: number;
  totalPnL: number;
  lastUpdated: Date;
}

export interface TrackedTrader {
  address: string;
  multiplier: number;
  active: boolean;
  lastSeenTrade?: Date;
}

export interface RiskLimits {
  maxPositionSizeUSD: number;
  maxTotalExposureUSD: number;
  maxSlippageTolerance: number;
  minTradeSizeUSD: number;
}

export interface SlippageCheckResult {
  allowed: boolean;
  requestedPrice: number;
  currentPrice: number;
  slippagePercent: number;
  reason?: string;
}

export interface AggregatedTrade {
  marketId: string;
  outcomeId: string;
  side: OrderSide;
  totalSize: number;
  averagePrice: number;
  tradeIds: string[];
  timestamp: Date;
}

export interface ExecutionResult {
  success: boolean;
  orderId: string;
  executedSize: number;
  executedPrice: number;
  transactionHash?: string;
  error?: string;
}

export interface PriceSnapshot {
  marketId: string;
  outcomeId: string;
  price: number;
  timestamp: Date;
  volume?: number;
}

export interface TestModeConfig {
  enabled: boolean;
  initialBalance: number;
  volatility: number;
  deterministicSeed?: number;
}

export interface BotConfig {
  testMode: TestModeConfig;
  mongodb: {
    uri: string;
    database: string;
  };
  wallet: {
    privateKey?: string;
  };
  risk: RiskLimits;
  trackedTraders: TrackedTrader[];
  aggregationWindowMs: number;
  enableSlippageProtection: boolean;
  enableExposureLimits: boolean;
}

export interface TradeReplayConfig {
  filePath: string;
  speed: number; // 1x, 5x, etc. 0 = instant
  startIndex?: number;
  endIndex?: number;
}

export interface SimulatorStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  finalBalance: number;
  totalPnL: number;
  maxDrawdown: number;
}
