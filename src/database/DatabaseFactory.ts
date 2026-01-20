import { config } from '../config/ConfigManager';
import { database as mongoDatabase } from './DatabaseManager';
import { inMemoryDatabase } from './InMemoryDatabaseManager';
import {
  Trade,
  ExecutionOrder,
  Position,
} from '../types';

/**
 * IDatabaseAdapter - Common interface for database operations
 * Implemented by both MongoDB and InMemory adapters
 */
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveTrade(trade: Trade): Promise<void>;
  saveExecutionOrder(order: ExecutionOrder): Promise<void>;
  updateExecutionOrder(orderId: string, updates: Partial<ExecutionOrder>): Promise<void>;
  getExecutionOrder(orderId: string): Promise<ExecutionOrder | null>;
  isTradeProcessed(tradeId: string): Promise<boolean>;
  savePosition(position: Position): Promise<void>;
  getPosition(marketId: string, outcomeId: string): Promise<Position | null>;
  getAllPositions(): Promise<Position[]>;
  getRecentTrades(limit?: number): Promise<Trade[]>;
  getRecentExecutionOrders(limit?: number): Promise<ExecutionOrder[]>;
  clearAllData(): Promise<void>;
}

/**
 * DatabaseFactory - Returns the appropriate database adapter based on configuration
 * 
 * In TEST_MODE: Returns InMemoryDatabaseManager (no MongoDB required)
 * In LIVE_MODE: Returns DatabaseManager (MongoDB required)
 */
export class DatabaseFactory {
  private static currentAdapter: IDatabaseAdapter | null = null;

  /**
   * Get the appropriate database adapter for the current mode
   */
  public static getDatabase(): IDatabaseAdapter {
    if (config.isTestMode()) {
      // Use in-memory database for test mode - no external dependencies required
      return inMemoryDatabase as unknown as IDatabaseAdapter;
    } else {
      // Use MongoDB for live mode
      return mongoDatabase as unknown as IDatabaseAdapter;
    }
  }

  /**
   * Get and cache the database adapter
   */
  public static async getConnectedDatabase(): Promise<IDatabaseAdapter> {
    if (!this.currentAdapter) {
      this.currentAdapter = this.getDatabase();
      await this.currentAdapter.connect();
    }
    return this.currentAdapter;
  }

  /**
   * Disconnect the current adapter
   */
  public static async disconnect(): Promise<void> {
    if (this.currentAdapter) {
      await this.currentAdapter.disconnect();
      this.currentAdapter = null;
    }
  }

  /**
   * Check if using in-memory database
   */
  public static isUsingInMemoryDatabase(): boolean {
    return config.isTestMode();
  }
}

// Default export for convenience
export const db = DatabaseFactory;
