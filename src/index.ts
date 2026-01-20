import { config } from './config/ConfigManager';
import { DatabaseFactory } from './database/DatabaseFactory';
import { monitorService } from './services/monitor/MonitorService';
import { executorService } from './services/executor/ExecutorService';
import { ExecutorFactory } from './services/executor/ExecutorFactory';
import { dashboard } from './cli/Dashboard';
import { logger } from './utils/logger';
import { Trade, TrackedTrader } from './types';

/**
 * Main Bot Application
 */
export class PolymarketCopyBot {
  private isRunning = false;

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting Polymarket Copy Trading Bot...');

      // Display mode
      const isTestMode = config.isTestMode();
      if (isTestMode) {
        logger.info('═══════════════════════════════════════════════════');
        logger.info('🧪 TEST MODE ENABLED - No real trades will execute');
        logger.info('═══════════════════════════════════════════════════');
      } else {
        logger.warn('═══════════════════════════════════════════════════');
        logger.warn('🔴 LIVE MODE - Real trades will be executed!');
        logger.warn('═══════════════════════════════════════════════════');
        logger.warn('Press Ctrl+C to cancel within 5 seconds...');
        await this.sleep(5000);
      }

      // Connect to database (uses in-memory DB for test mode, MongoDB for live)
      logger.info('Connecting to database...');
      await DatabaseFactory.getConnectedDatabase();
      const dbType = DatabaseFactory.isUsingInMemoryDatabase() ? 'In-Memory' : 'MongoDB';
      logger.info(`Connected to ${dbType} database`);

      // Initialize executor
      logger.info('Initializing executor...');
      await ExecutorFactory.getExecutor();

      // Set up trade processing
      monitorService.on('trade', (trade: unknown, traderConfig: unknown) => {
        void executorService.processTrade(trade as Trade, traderConfig as TrackedTrader);
      });

      // Start monitor service
      logger.info('Starting monitor service...');
      await monitorService.start();

      // Start dashboard
      logger.info('Starting dashboard...');
      await dashboard.start();

      this.isRunning = true;
      logger.info('✅ Bot started successfully');

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        void this.stop();
      });

      process.on('SIGTERM', () => {
        void this.stop();
      });

    } catch (error) {
      logger.error('Failed to start bot', { error });
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping bot...');
    this.isRunning = false;

    // Stop dashboard
    dashboard.stop();

    // Stop monitor
    await monitorService.stop();

    // Shutdown executor
    await ExecutorFactory.shutdown();

    // Disconnect database
    await DatabaseFactory.disconnect();

    logger.info('Bot stopped');
    process.exit(0);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if executed directly
if (require.main === module) {
  const bot = new PolymarketCopyBot();
  void bot.start();
}
