import { config } from '../config/ConfigManager';
import { logger } from '../utils/logger';
import {
  Trade,
  ExecutionOrder,
  Position,
  TrackedTrader,
} from '../types';

/**
 * InMemoryDatabaseManager - In-memory database adapter for test mode
 * Provides the same interface as DatabaseManager but stores data in memory
 * No MongoDB required
 */
export class InMemoryDatabaseManager {
  private static instance: InMemoryDatabaseManager;
  
  private trades: Map<string, Trade> = new Map();
  private executionOrders: Map<string, ExecutionOrder> = new Map();
  private positions: Map<string, Position> = new Map();
  private trackedTraders: Map<string, TrackedTrader> = new Map();
  private connected = false;

  private constructor() {}

  public static getInstance(): InMemoryDatabaseManager {
    if (!InMemoryDatabaseManager.instance) {
      InMemoryDatabaseManager.instance = new InMemoryDatabaseManager();
    }
    return InMemoryDatabaseManager.instance;
  }

  /**
   * Connect - just marks as connected for in-memory mode
   */
  connect(): Promise<void> {
    if (!config.isTestMode()) {
      return Promise.reject(new Error('InMemoryDatabaseManager can only be used in TEST_MODE'));
    }
    
    this.connected = true;
    logger.info('[TEST MODE] In-memory database connected');
    return Promise.resolve();
  }

  /**
   * Disconnect - clears connection flag
   */
  disconnect(): Promise<void> {
    this.connected = false;
    logger.info('[TEST MODE] In-memory database disconnected');
    return Promise.resolve();
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error('In-memory database not connected');
    }
  }

  /**
   * Save detected trade
   */
  saveTrade(trade: Trade): Promise<void> {
    this.assertConnected();
    
    if (this.trades.has(trade.id)) {
      logger.warn(`[TEST MODE] Duplicate trade detected: ${trade.id}`);
      return Promise.resolve();
    }
    
    this.trades.set(trade.id, { ...trade });
    logger.info(`[TEST MODE] Trade saved: ${trade.id}`);
    return Promise.resolve();
  }

  /**
   * Save execution order
   */
  saveExecutionOrder(order: ExecutionOrder): Promise<void> {
    this.assertConnected();
    this.executionOrders.set(order.id, { ...order });
    logger.info(`[TEST MODE] Execution order saved: ${order.id}`);
    return Promise.resolve();
  }

  /**
   * Update execution order status
   */
  updateExecutionOrder(orderId: string, updates: Partial<ExecutionOrder>): Promise<void> {
    this.assertConnected();
    
    const existing = this.executionOrders.get(orderId);
    if (existing) {
      this.executionOrders.set(orderId, { ...existing, ...updates });
      logger.info(`[TEST MODE] Execution order updated: ${orderId}`);
    }
    return Promise.resolve();
  }

  /**
   * Get execution order by ID
   */
  getExecutionOrder(orderId: string): Promise<ExecutionOrder | null> {
    this.assertConnected();
    return Promise.resolve(this.executionOrders.get(orderId) || null);
  }

  /**
   * Check if trade has been processed
   */
  isTradeProcessed(tradeId: string): Promise<boolean> {
    this.assertConnected();
    
    for (const order of this.executionOrders.values()) {
      if (order.originalTradeId === tradeId) {
        return Promise.resolve(true);
      }
    }
    return Promise.resolve(false);
  }

  /**
   * Save or update position
   */
  savePosition(position: Position): Promise<void> {
    this.assertConnected();
    this.positions.set(position.id, { ...position });
    logger.info(`[TEST MODE] Position saved: ${position.id}`);
    return Promise.resolve();
  }

  /**
   * Get position
   */
  getPosition(marketId: string, outcomeId: string): Promise<Position | null> {
    this.assertConnected();
    const positionId = `${marketId}:${outcomeId}`;
    return Promise.resolve(this.positions.get(positionId) || null);
  }

  /**
   * Get all positions
   */
  getAllPositions(): Promise<Position[]> {
    this.assertConnected();
    return Promise.resolve(Array.from(this.positions.values()));
  }

  /**
   * Get recent trades
   */
  getRecentTrades(limit: number = 100): Promise<Trade[]> {
    this.assertConnected();
    
    const trades = Array.from(this.trades.values());
    trades.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return Promise.resolve(trades.slice(0, limit));
  }

  /**
   * Get recent execution orders
   */
  getRecentExecutionOrders(limit: number = 100): Promise<ExecutionOrder[]> {
    this.assertConnected();
    
    const orders = Array.from(this.executionOrders.values());
    orders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return Promise.resolve(orders.slice(0, limit));
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData(): Promise<void> {
    this.assertConnected();
    
    this.trades.clear();
    this.executionOrders.clear();
    this.positions.clear();
    this.trackedTraders.clear();
    
    logger.warn('[TEST MODE] All in-memory data cleared');
    return Promise.resolve();
  }

  /**
   * Get stats for dashboard
   */
  getStats(): { trades: number; orders: number; positions: number } {
    return {
      trades: this.trades.size,
      orders: this.executionOrders.size,
      positions: this.positions.size,
    };
  }
}

export const inMemoryDatabase = InMemoryDatabaseManager.getInstance();
