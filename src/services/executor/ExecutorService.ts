import { Trade, ExecutionOrder, OrderStatus, TrackedTrader } from '../../types';
import { ExecutorFactory } from './ExecutorFactory';
import { riskEngine } from '../risk/RiskEngine';
import { positionManager } from '../position/PositionManager';
import { database } from '../../database/DatabaseManager';
import { config } from '../../config/ConfigManager';
import { logger } from '../../utils/logger';


/**
 * ExecutorService - Orchestrates trade execution pipeline
 * 
 * Responsibilities:
 * - Process detected trades
 * - Apply position sizing
 * - Validate against risk rules
 * - Execute via Live or Mock executor
 * - Update positions
 */
export class ExecutorService {
  private static instance: ExecutorService;

  private constructor() {}

  public static getInstance(): ExecutorService {
    if (!ExecutorService.instance) {
      ExecutorService.instance = new ExecutorService();
    }
    return ExecutorService.instance;
  }

  /**
   * Process a detected trade
   */
  async processTrade(trade: Trade, traderConfig: TrackedTrader): Promise<void> {
    try {
      logger.info(`Processing trade: ${trade.id}`, {
        side: trade.side,
        size: trade.size,
        price: trade.price,
        multiplier: traderConfig.multiplier,
      });

      // Check if already processed
      const isProcessed = await database.isTradeProcessed(trade.id);
      if (isProcessed) {
        logger.warn(`Trade ${trade.id} already processed, skipping`);
        return;
      }

      // Apply position sizing
      const adjustedSize = riskEngine.calculateSafePositionSize(
        trade.size,
        traderConfig.multiplier,
        trade.price
      );

      if (adjustedSize === 0) {
        logger.info(`Trade ${trade.id} size too small after adjustments, skipping`);
        return;
      }

      // Create execution order
      const order: ExecutionOrder = {
        id: this.generateOrderId(),
        originalTradeId: trade.id,
        traderAddress: trade.traderAddress,
        marketId: trade.marketId,
        outcomeId: trade.outcomeId,
        side: trade.side,
        requestedSize: adjustedSize,
        executedSize: 0,
        requestedPrice: trade.price,
        executedPrice: 0,
        status: OrderStatus.PENDING,
        timestamp: new Date(),
        mode: config.getExecutionMode(),
      };

      // Save order
      await database.saveExecutionOrder(order);

      // Validate against risk rules
      const validation = await riskEngine.validateOrder(order);
      if (!validation.valid) {
        logger.warn(`Order ${order.id} rejected by risk engine: ${validation.reason}`);
        
        await database.updateExecutionOrder(order.id, {
          status: OrderStatus.REJECTED,
          rejectionReason: validation.reason,
        });
        
        return;
      }

      // Execute order
      await this.executeOrder(order);

    } catch (error) {
      logger.error('Error processing trade', { error, trade });
    }
  }

  /**
   * Execute an order
   */
  private async executeOrder(order: ExecutionOrder): Promise<void> {
    try {
      const executor = await ExecutorFactory.getExecutor();
      
      logger.info(`Executing order ${order.id}: ${order.side} ${order.requestedSize} @ ${order.requestedPrice}`);

      const result = await executor.executeOrder(order);

      if (result.success) {
        // Update order status
        await database.updateExecutionOrder(order.id, {
          status: OrderStatus.EXECUTED,
          executedSize: result.executedSize,
          executedPrice: result.executedPrice,
          executionTimestamp: new Date(),
        });

        // Update positions
        await positionManager.updatePosition(
          order.marketId,
          order.outcomeId,
          order.side,
          result.executedSize,
          result.executedPrice
        );

        logger.info(`✅ Order ${order.id} executed successfully`, {
          executedSize: result.executedSize,
          executedPrice: result.executedPrice,
          transactionHash: result.transactionHash,
        });

      } else {
        // Mark as failed
        await database.updateExecutionOrder(order.id, {
          status: OrderStatus.FAILED,
          rejectionReason: result.error,
        });

        logger.error(`❌ Order ${order.id} execution failed: ${result.error}`);
      }

    } catch (error) {
      logger.error(`Error executing order ${order.id}`, { error });
      
      await database.updateExecutionOrder(order.id, {
        status: OrderStatus.FAILED,
        rejectionReason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    // Using crypto.randomUUID equivalent
    return `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get execution statistics
   */
  async getStats(): Promise<{
    totalOrders: number;
    executed: number;
    failed: number;
    rejected: number;
    pending: number;
  }> {
    const orders = await database.getRecentExecutionOrders(1000);

    return {
      totalOrders: orders.length,
      executed: orders.filter(o => o.status === OrderStatus.EXECUTED).length,
      failed: orders.filter(o => o.status === OrderStatus.FAILED).length,
      rejected: orders.filter(o => o.status === OrderStatus.REJECTED).length,
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    };
  }
}

export const executorService = ExecutorService.getInstance();
