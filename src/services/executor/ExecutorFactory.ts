import { IExecutor } from './IExecutor';
import { config } from '../../config/ConfigManager';
import { logger } from '../../utils/logger';

/**
 * ExecutorFactory - Safely creates the appropriate executor based on mode
 * 
 * CRITICAL: This is the ONLY way to instantiate executors
 */
export class ExecutorFactory {
  private static instance: IExecutor | null = null;

  /**
   * Get executor instance (singleton)
   */
  public static async getExecutor(): Promise<IExecutor> {
    if (this.instance) {
      return this.instance;
    }

    const isTestMode = config.isTestMode();

    if (isTestMode) {
      logger.info('🧪 ExecutorFactory: Creating MockExecutor (TEST MODE)');
      
      // Dynamic import to avoid loading LiveExecutor in test mode
      const { MockExecutor } = await import('../../simulators/MockExecutor');
      this.instance = new MockExecutor();
    } else {
      logger.warn('🔴 ExecutorFactory: Creating LiveExecutor (LIVE MODE - REAL MONEY)');
      logger.warn('🔴 All trades will use REAL FUNDS and be executed on Polymarket');
      
      // Dynamic import with safety guard
      const { LiveExecutor } = await import('./LiveExecutor');
      this.instance = new LiveExecutor();
    }

    await this.instance.initialize();
    return this.instance;
  }

  /**
   * Shutdown current executor
   */
  public static async shutdown(): Promise<void> {
    if (this.instance) {
      await this.instance.shutdown();
      this.instance = null;
    }
  }

  /**
   * Reset factory (for testing)
   */
  public static reset(): void {
    this.instance = null;
  }
}
