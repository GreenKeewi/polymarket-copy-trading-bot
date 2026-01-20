import chalk from 'chalk';
import Table from 'cli-table3';
import { config } from '../config/ConfigManager';
import { positionManager } from '../services/position/PositionManager';
import { executorService } from '../services/executor/ExecutorService';
import { ExecutorFactory } from '../services/executor/ExecutorFactory';
import { logger } from '../utils/logger';

/**
 * Dashboard - CLI dashboard for monitoring bot status
 * 
 * Displays:
 * - TEST MODE warning (if applicable)
 * - Balance information
 * - Positions
 * - Recent trades
 * - Execution statistics
 */
export class Dashboard {
  private refreshInterval: NodeJS.Timeout | null = null;

  /**
   * Start dashboard with auto-refresh
   */
  async start(intervalMs: number = 5000): Promise<void> {
    await this.render();
    
    this.refreshInterval = setInterval(() => {
      void this.render();
    }, intervalMs);

    logger.info(`Dashboard started (refresh every ${intervalMs}ms)`);
  }

  /**
   * Stop dashboard
   */
  stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    logger.info('Dashboard stopped');
  }

  /**
   * Render dashboard once
   */
  async render(): Promise<void> {
    // Clear screen
    console.clear();

    // Header
    this.renderHeader();

    // Balance
    await this.renderBalance();

    // Positions
    await this.renderPositions();

    // Statistics
    await this.renderStats();

    // Footer
    this.renderFooter();
  }

  /**
   * Render header with mode indicator
   */
  private renderHeader(): void {
    const isTestMode = config.isTestMode();

    if (isTestMode) {
      console.log(chalk.bgYellow.black.bold('\n                                              '));
      console.log(chalk.bgYellow.black.bold('   🧪 TEST MODE - NO REAL TRADES EXECUTED   '));
      console.log(chalk.bgYellow.black.bold('                                              '));
      console.log();
    } else {
      console.log(chalk.bgRed.white.bold('\n                                              '));
      console.log(chalk.bgRed.white.bold('   🔴 LIVE MODE - USING REAL MONEY          '));
      console.log(chalk.bgRed.white.bold('                                              '));
      console.log();
    }

    console.log(chalk.bold('Polymarket Copy Trading Bot'));
    console.log(chalk.gray(`Mode: ${isTestMode ? 'TEST' : 'LIVE'}`));
    console.log(chalk.gray(`Time: ${new Date().toLocaleString()}`));
    console.log();
  }

  /**
   * Render balance information
   */
  private async renderBalance(): Promise<void> {
    try {
      const executor = await ExecutorFactory.getExecutor();
      const balance = await executor.getBalance();
      const pnl = await positionManager.getTotalPnL();

      const table = new Table({
        head: ['Metric', 'Value'],
        colWidths: [25, 20],
      });

      const isTestMode = config.isTestMode();
      const prefix = isTestMode ? '[SIMULATED] ' : '';

      table.push(
        [chalk.bold(`${prefix}Available Balance`), chalk.cyan(`$${balance.available.toFixed(2)}`)],
        [chalk.bold(`${prefix}Total Balance`), chalk.cyan(`$${balance.total.toFixed(2)}`)],
        [chalk.bold(`${prefix}Realized PnL`), this.colorPnL(pnl.realized)],
        [chalk.bold(`${prefix}Unrealized PnL`), this.colorPnL(pnl.unrealized)],
        [chalk.bold(`${prefix}Total PnL`), this.colorPnL(pnl.total)]
      );

      console.log(chalk.bold('💰 Balance'));
      console.log(table.toString());
      console.log();

    } catch (error) {
      console.log(chalk.red('Error fetching balance'));
      console.log();
    }
  }

  /**
   * Render positions
   */
  private async renderPositions(): Promise<void> {
    try {
      const positions = await positionManager.getAllPositions();

      if (positions.length === 0) {
        console.log(chalk.bold('📊 Positions'));
        console.log(chalk.gray('No open positions'));
        console.log();
        return;
      }

      const table = new Table({
        head: ['Market', 'Outcome', 'Qty', 'Avg Price', 'Current', 'PnL'],
        colWidths: [25, 20, 10, 12, 12, 15],
      });

      for (const position of positions) {
        table.push([
          position.marketId.substring(0, 22) + '...',
          position.outcomeId.substring(0, 17) + '...',
          position.quantity.toFixed(2),
          `$${position.averagePrice.toFixed(4)}`,
          `$${position.currentPrice.toFixed(4)}`,
          this.colorPnL(position.unrealizedPnL),
        ]);
      }

      console.log(chalk.bold('📊 Positions'));
      console.log(table.toString());
      console.log();

    } catch (error) {
      console.log(chalk.red('Error fetching positions'));
      console.log();
    }
  }

  /**
   * Render execution statistics
   */
  private async renderStats(): Promise<void> {
    try {
      const stats = await executorService.getStats();

      const table = new Table({
        head: ['Status', 'Count'],
        colWidths: [20, 15],
      });

      table.push(
        ['Total Orders', stats.totalOrders.toString()],
        [chalk.green('Executed'), chalk.green(stats.executed.toString())],
        [chalk.red('Failed'), chalk.red(stats.failed.toString())],
        [chalk.yellow('Rejected'), chalk.yellow(stats.rejected.toString())],
        [chalk.blue('Pending'), chalk.blue(stats.pending.toString())]
      );

      console.log(chalk.bold('📈 Execution Statistics'));
      console.log(table.toString());
      console.log();

    } catch (error) {
      console.log(chalk.red('Error fetching stats'));
      console.log();
    }
  }

  /**
   * Render footer
   */
  private renderFooter(): void {
    const isTestMode = config.isTestMode();

    if (isTestMode) {
      console.log(chalk.yellow.bold('⚠️  All values are SIMULATED - No real money at risk'));
    } else {
      console.log(chalk.red.bold('⚠️  LIVE MODE - Trades execute with REAL MONEY'));
    }

    console.log(chalk.gray('Press Ctrl+C to exit'));
  }

  /**
   * Color code PnL values
   */
  private colorPnL(value: number): string {
    const formatted = `$${value.toFixed(2)}`;
    if (value > 0) {
      return chalk.green(formatted);
    } else if (value < 0) {
      return chalk.red(formatted);
    } else {
      return chalk.gray(formatted);
    }
  }
}

export const dashboard = new Dashboard();
