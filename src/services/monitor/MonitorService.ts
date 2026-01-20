import { Trade, TrackedTrader } from '../../types';
import { config } from '../../config/ConfigManager';
import { DatabaseFactory, IDatabaseAdapter } from '../../database/DatabaseFactory';
import { logger } from '../../utils/logger';
import { EventEmitter } from 'events';

/**
 * MonitorService - Detects trades from tracked traders
 * 
 * Responsibilities:
 * - Poll Polymarket API for trader activity
 * - Detect new trades
 * - Emit trade events for processing
 * - Deduplicate trades
 */
export class MonitorService extends EventEmitter {
  private static instance: MonitorService;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private trackedTraders: TrackedTrader[] = [];
  private database: IDatabaseAdapter | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }

  /**
   * Get the database adapter (lazy initialization)
   */
  private async getDatabase(): Promise<IDatabaseAdapter> {
    if (!this.database) {
      this.database = await DatabaseFactory.getConnectedDatabase();
    }
    return this.database;
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('MonitorService already running');
      return;
    }

    const botConfig = config.getConfig();
    this.trackedTraders = botConfig.trackedTraders.filter(t => t.active);

    if (this.trackedTraders.length === 0) {
      throw new Error('No active traders to track');
    }

    logger.info(`Starting MonitorService for ${this.trackedTraders.length} traders:`, {
      traders: this.trackedTraders.map(t => ({
        address: t.address,
        multiplier: t.multiplier,
      })),
    });

    this.isRunning = true;

    // Start polling
    // In production, this would poll Polymarket API
    // For now, we'll set up the infrastructure
    const pollIntervalMs = 5000; // Poll every 5 seconds

    this.pollInterval = setInterval(() => {
      void this.pollTrades();
    }, pollIntervalMs);

    logger.info(`MonitorService started (polling every ${pollIntervalMs}ms)`);
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRunning = false;
    logger.info('MonitorService stopped');
  }

  /**
   * Poll for new trades
   */
  private async pollTrades(): Promise<void> {
    try {
      for (const trader of this.trackedTraders) {
        await this.pollTraderTrades(trader);
      }
    } catch (error) {
      logger.error('Error polling trades', { error });
    }
  }

  /**
   * Poll trades for specific trader
   */
  private async pollTraderTrades(trader: TrackedTrader): Promise<void> {
    try {
      // TODO: Implement real Polymarket API polling
      // This would:
      // 1. Query Polymarket API for trader's recent trades
      // 2. Filter for new trades since last poll
      // 3. Emit trade events
      
      // For now, this is a placeholder
      logger.debug(`Polling trades for ${trader.address}`);
      
    } catch (error) {
      logger.error(`Error polling trader ${trader.address}`, { error });
    }
  }

  /**
   * Manually feed a trade (used by replay system)
   */
  async feedTrade(trade: Trade): Promise<void> {
    try {
      const db = await this.getDatabase();
      
      // Check if already processed
      const isProcessed = await db.isTradeProcessed(trade.id);
      if (isProcessed) {
        logger.debug(`Trade ${trade.id} already processed, skipping`);
        return;
      }

      // Find trader config
      const traderConfig = this.trackedTraders.find(t => t.address === trade.traderAddress);
      if (!traderConfig) {
        logger.warn(`Trade from untracked trader ${trade.traderAddress}, skipping`);
        return;
      }

      // Save to database
      await db.saveTrade(trade);

      // Emit event for processing
      this.emit('trade', trade, traderConfig);

      logger.info(`Trade detected: ${trade.side} ${trade.size} @ ${trade.price}`, {
        tradeId: trade.id,
        trader: trade.traderAddress,
        market: trade.marketId,
      });

    } catch (error) {
      logger.error('Error feeding trade', { error, trade });
      throw error;
    }
  }

  /**
   * Get tracked traders
   */
  getTrackedTraders(): TrackedTrader[] {
    return [...this.trackedTraders];
  }

  /**
   * Check if running
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }
}

export const monitorService = MonitorService.getInstance();
