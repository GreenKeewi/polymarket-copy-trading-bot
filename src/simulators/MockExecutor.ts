import { IExecutor } from '../services/executor/IExecutor';
import { ExecutionOrder, ExecutionResult, OrderSide } from '../types';
import { MockWalletEngine } from './MockWalletEngine';
import { PriceSimulator } from './PriceSimulator';
import { logger } from '../utils/logger';
import { config } from '../config/ConfigManager';

/**
 * MockExecutor - Test mode execution engine
 * 
 * This executor:
 * - Uses MockWalletEngine for simulated trading
 * - Uses PriceSimulator for market prices
 * - Enforces same validation as live executor
 * - NEVER touches real money
 */
export class MockExecutor implements IExecutor {
  private wallet: MockWalletEngine;
  private priceSimulator: PriceSimulator;
  private initialized = false;

  constructor() {
    const botConfig = config.getConfig();
    
    if (!botConfig.testMode.enabled) {
      throw new Error('MockExecutor can only be used in TEST_MODE');
    }

    this.wallet = new MockWalletEngine(botConfig.testMode.initialBalance);
    this.priceSimulator = new PriceSimulator(
      botConfig.testMode.volatility,
      botConfig.testMode.deterministicSeed
    );

    logger.info('🧪 MockExecutor instantiated - TEST MODE');
  }

  async initialize(): Promise<void> {
    config.assertTestMode();

    logger.info('Initializing MockExecutor (TEST MODE)...');
    
    // No real connections needed, but we can set up simulators
    await this.priceSimulator.initialize();
    
    this.initialized = true;
    logger.info('✅ MockExecutor initialized (TEST MODE - NO REAL TRADES)');
  }

  async executeOrder(order: ExecutionOrder): Promise<ExecutionResult> {
    config.assertTestMode();

    if (!this.initialized) {
      throw new Error('MockExecutor not initialized');
    }

    logger.info(`🧪 SIMULATING ORDER: ${order.side} ${order.requestedSize} @ ${order.requestedPrice}`, {
      marketId: order.marketId,
      outcomeId: order.outcomeId,
    });

    try {
      // Get current simulated price
      const currentPrice = this.priceSimulator.getPrice(order.marketId, order.outcomeId);
      
      // Simulate some price movement and slippage
      const executionPrice = this.simulateExecutionPrice(
        order.requestedPrice,
        currentPrice,
        order.side
      );

      // Execute on mock wallet
      let success: boolean;
      if (order.side === OrderSide.BUY) {
        success = this.wallet.buy(
          order.marketId,
          order.outcomeId,
          order.requestedSize,
          executionPrice
        );
      } else {
        success = this.wallet.sell(
          order.marketId,
          order.outcomeId,
          order.requestedSize,
          executionPrice
        );
      }

      if (!success) {
        return {
          success: false,
          orderId: order.id,
          executedSize: 0,
          executedPrice: 0,
          error: order.side === OrderSide.BUY 
            ? 'Insufficient balance' 
            : 'Insufficient position',
        };
      }

      // Generate fake transaction hash
      const txHash = `0xTEST${Date.now()}${Math.random().toString(36).substring(7)}`;

      logger.info(`✅ Mock order executed: ${order.requestedSize} @ $${executionPrice.toFixed(4)}`);

      return {
        success: true,
        orderId: order.id,
        executedSize: order.requestedSize,
        executedPrice: executionPrice,
        transactionHash: txHash,
      };

    } catch (error) {
      logger.error('Mock order execution failed', { error, order });
      
      return {
        success: false,
        orderId: order.id,
        executedSize: 0,
        executedPrice: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getBalance(): Promise<{ available: number; total: number }> {
    config.assertTestMode();
    
    if (!this.initialized) {
      throw new Error('MockExecutor not initialized');
    }

    const balance = this.wallet.getBalance();
    return {
      available: balance.available,
      total: balance.total,
    };
  }

  async getAvailableCapital(): Promise<number> {
    config.assertTestMode();
    
    if (!this.initialized) {
      throw new Error('MockExecutor not initialized');
    }

    const balance = this.wallet.getBalance();
    // Return total capital (cash + position values)
    return balance.total;
  }

  async getPosition(marketId: string, outcomeId: string): Promise<{ quantity: number; averagePrice: number } | null> {
    config.assertTestMode();
    
    if (!this.initialized) {
      throw new Error('MockExecutor not initialized');
    }

    const position = this.wallet.getPosition(marketId, outcomeId);
    if (!position) {
      return null;
    }

    return {
      quantity: position.quantity,
      averagePrice: position.averagePrice,
    };
  }

  async canExecute(order: ExecutionOrder): Promise<{ canExecute: boolean; reason?: string }> {
    config.assertTestMode();
    
    if (!this.initialized) {
      return { canExecute: false, reason: 'Executor not initialized' };
    }

    const balance = this.wallet.getBalance();

    if (order.side === OrderSide.BUY) {
      const cost = order.requestedSize * order.requestedPrice;
      if (cost > balance.available) {
        return { 
          canExecute: false, 
          reason: `Insufficient balance: need $${cost.toFixed(2)}, have $${balance.available.toFixed(2)}` 
        };
      }
    } else {
      const position = this.wallet.getPosition(order.marketId, order.outcomeId);
      if (!position || position.quantity < order.requestedSize) {
        return { 
          canExecute: false, 
          reason: `Insufficient position: have ${position?.quantity || 0}, trying to sell ${order.requestedSize}` 
        };
      }
    }

    return { canExecute: true };
  }

  /**
   * Get current market price from price simulator
   */
  async getCurrentPrice(marketId: string, outcomeId: string): Promise<number> {
    config.assertTestMode();
    
    if (!this.initialized) {
      throw new Error('MockExecutor not initialized');
    }

    return this.priceSimulator.getPrice(marketId, outcomeId);
  }

  getType(): 'LIVE' | 'MOCK' {
    return 'MOCK';
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MockExecutor');
    this.initialized = false;
  }

  /**
   * Get mock wallet for testing and stats
   */
  public getWallet(): MockWalletEngine {
    return this.wallet;
  }

  /**
   * Get price simulator
   */
  public getPriceSimulator(): PriceSimulator {
    return this.priceSimulator;
  }

  /**
   * Simulate execution price with slippage
   */
  private simulateExecutionPrice(_requestedPrice: number, currentPrice: number, side: OrderSide): number {
    // Simulate small random slippage (0-0.5%)
    const slippagePercent = Math.random() * 0.005;
    
    if (side === OrderSide.BUY) {
      // Buys execute at slightly higher price
      return currentPrice * (1 + slippagePercent);
    } else {
      // Sells execute at slightly lower price
      return currentPrice * (1 - slippagePercent);
    }
  }
}
