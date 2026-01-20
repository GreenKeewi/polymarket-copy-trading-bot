import { MongoClient, Db, Collection } from 'mongodb';
import { config } from '../config/ConfigManager';
import { logger } from '../utils/logger';
import {
  Trade,
  ExecutionOrder,
  Position,
  TrackedTrader,
} from '../types';

// MongoDB error codes
const MONGO_DUPLICATE_KEY_ERROR = 11000;

/**
 * DatabaseManager - MongoDB adapter
 * Source of truth for all bot state
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<void> {
    const { mongodb } = config.getConfig();

    try {
      this.client = new MongoClient(mongodb.uri);
      await this.client.connect();
      this.db = this.client.db(mongodb.database);

      // Create indexes
      await this.createIndexes();

      logger.info(`Connected to MongoDB: ${mongodb.database}`);
    } catch (error) {
      logger.error('Failed to connect to MongoDB', { error });
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Create necessary indexes
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    // Trades collection indexes
    await this.db.collection('trades').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('trades').createIndex({ traderAddress: 1 });
    await this.db.collection('trades').createIndex({ timestamp: -1 });

    // Execution orders collection indexes
    await this.db.collection('executionOrders').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('executionOrders').createIndex({ originalTradeId: 1 });
    await this.db.collection('executionOrders').createIndex({ status: 1 });

    // Positions collection indexes
    await this.db.collection('positions').createIndex({ id: 1 }, { unique: true });
    await this.db.collection('positions').createIndex({ marketId: 1, outcomeId: 1 });

    logger.info('Database indexes created');
  }

  /**
   * Trades collection
   */
  public getTradesCollection(): Collection<Trade> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<Trade>('trades');
  }

  /**
   * Execution orders collection
   */
  public getExecutionOrdersCollection(): Collection<ExecutionOrder> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<ExecutionOrder>('executionOrders');
  }

  /**
   * Positions collection
   */
  public getPositionsCollection(): Collection<Position> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<Position>('positions');
  }

  /**
   * Tracked traders collection
   */
  public getTrackedTradersCollection(): Collection<TrackedTrader> {
    if (!this.db) throw new Error('Database not connected');
    return this.db.collection<TrackedTrader>('trackedTraders');
  }

  /**
   * Save detected trade
   */
  async saveTrade(trade: Trade): Promise<void> {
    try {
      await this.getTradesCollection().insertOne(trade);
      logger.info(`Trade saved: ${trade.id}`);
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === MONGO_DUPLICATE_KEY_ERROR) {
        logger.warn(`Duplicate trade detected: ${trade.id}`);
      } else {
        logger.error('Failed to save trade', { error, trade });
        throw error;
      }
    }
  }

  /**
   * Save execution order
   */
  async saveExecutionOrder(order: ExecutionOrder): Promise<void> {
    try {
      await this.getExecutionOrdersCollection().insertOne(order);
      logger.info(`Execution order saved: ${order.id}`);
    } catch (error) {
      logger.error('Failed to save execution order', { error, order });
      throw error;
    }
  }

  /**
   * Update execution order status
   */
  async updateExecutionOrder(orderId: string, updates: Partial<ExecutionOrder>): Promise<void> {
    await this.getExecutionOrdersCollection().updateOne(
      { id: orderId },
      { $set: updates }
    );
    logger.info(`Execution order updated: ${orderId}`);
  }

  /**
   * Get execution order by ID
   */
  async getExecutionOrder(orderId: string): Promise<ExecutionOrder | null> {
    return await this.getExecutionOrdersCollection().findOne({ id: orderId });
  }

  /**
   * Check if trade has been processed
   */
  async isTradeProcessed(tradeId: string): Promise<boolean> {
    const order = await this.getExecutionOrdersCollection().findOne({ originalTradeId: tradeId });
    return order !== null;
  }

  /**
   * Save or update position
   */
  async savePosition(position: Position): Promise<void> {
    await this.getPositionsCollection().updateOne(
      { id: position.id },
      { $set: position },
      { upsert: true }
    );
    logger.info(`Position saved: ${position.id}`);
  }

  /**
   * Get position
   */
  async getPosition(marketId: string, outcomeId: string): Promise<Position | null> {
    const positionId = `${marketId}:${outcomeId}`;
    return await this.getPositionsCollection().findOne({ id: positionId });
  }

  /**
   * Get all positions
   */
  async getAllPositions(): Promise<Position[]> {
    return await this.getPositionsCollection().find({}).toArray();
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(limit: number = 100): Promise<Trade[]> {
    return await this.getTradesCollection()
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Get recent execution orders
   */
  async getRecentExecutionOrders(limit: number = 100): Promise<ExecutionOrder[]> {
    return await this.getExecutionOrdersCollection()
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Clear all data (for testing)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    await this.db.collection('trades').deleteMany({});
    await this.db.collection('executionOrders').deleteMany({});
    await this.db.collection('positions').deleteMany({});
    await this.db.collection('trackedTraders').deleteMany({});

    logger.warn('All database data cleared');
  }
}

export const database = DatabaseManager.getInstance();
