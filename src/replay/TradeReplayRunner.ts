import * as fs from 'fs/promises';
import { Trade, TradeReplayConfig } from '../types';
import { monitorService } from '../services/monitor/MonitorService';
import { logger } from '../utils/logger';
import { config } from '../config/ConfigManager';

/**
 * TradeReplayRunner - Replays historical trades for testing
 * 
 * Capabilities:
 * - Load trades from JSON file
 * - Feed trades into monitor pipeline
 * - Support speed control (1x, 5x, instant)
 * - Batch replay
 */
export class TradeReplayRunner {
  private trades: Trade[] = [];
  private isReplaying = false;

  /**
   * Load trades from JSON file
   */
  async loadTrades(filePath: string): Promise<void> {
    config.assertTestMode();

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      // Support both array of trades and { trades: [...] } format
      const tradesArray: unknown[] = Array.isArray(parsed) ? parsed : (parsed as { trades: unknown[] }).trades;

      this.trades = tradesArray.map((t: unknown) => {
        const trade = t as Record<string, unknown>;
        return {
          ...trade,
          timestamp: new Date(trade.timestamp as string),
        } as Trade;
      });

      logger.info(`Loaded ${this.trades.length} trades from ${filePath}`);

    } catch (error) {
      logger.error('Failed to load trades file', { error, filePath });
      throw error;
    }
  }

  /**
   * Replay loaded trades
   */
  async replay(replayConfig?: Partial<TradeReplayConfig>): Promise<void> {
    config.assertTestMode();

    if (this.trades.length === 0) {
      throw new Error('No trades loaded. Call loadTrades() first.');
    }

    if (this.isReplaying) {
      throw new Error('Replay already in progress');
    }

    this.isReplaying = true;

    const speed = replayConfig?.speed ?? 0; // Default to instant
    const startIndex = replayConfig?.startIndex ?? 0;
    const endIndex = replayConfig?.endIndex ?? this.trades.length;

    const tradesToReplay = this.trades.slice(startIndex, endIndex);

    logger.info(`Starting trade replay: ${tradesToReplay.length} trades, speed: ${speed === 0 ? 'instant' : `${speed}x`}`);

    try {
      for (let i = 0; i < tradesToReplay.length; i++) {
        const trade = tradesToReplay[i];
        
        logger.info(`Replaying trade ${i + 1}/${tradesToReplay.length}: ${trade.id}`);

        // Feed trade to monitor service
        await monitorService.feedTrade(trade);

        // Apply delay based on speed
        if (speed > 0 && i < tradesToReplay.length - 1) {
          const nextTrade = tradesToReplay[i + 1];
          const timeDiff = nextTrade.timestamp.getTime() - trade.timestamp.getTime();
          const delay = timeDiff / speed;

          if (delay > 0) {
            await this.sleep(delay);
          }
        }
      }

      logger.info('Trade replay completed');

    } catch (error) {
      logger.error('Trade replay failed', { error });
      throw error;
    } finally {
      this.isReplaying = false;
    }
  }

  /**
   * Replay single trade
   */
  async replaySingleTrade(trade: Trade): Promise<void> {
    config.assertTestMode();

    logger.info(`Replaying single trade: ${trade.id}`);
    await monitorService.feedTrade(trade);
  }

  /**
   * Get loaded trades
   */
  getTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Check if replaying
   */
  isRunning(): boolean {
    return this.isReplaying;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Replay trades from command line
 */
export async function replayFromCLI(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // eslint-disable-next-line no-console
    console.log('Usage: npm run replay -- <trades-file.json> [speed]');
    // eslint-disable-next-line no-console
    console.log('  speed: 1x, 5x, or 0 for instant (default)');
    process.exit(1);
  }

  const filePath = args[0];
  const speed = args[1] ? parseFloat(args[1].replace('x', '')) : 0;

  const runner = new TradeReplayRunner();
  
  try {
    await runner.loadTrades(filePath);
    await runner.replay({ speed });
  } catch (error) {
    logger.error('Replay failed', { error });
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  void replayFromCLI();
}
