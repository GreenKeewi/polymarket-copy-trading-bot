import { Position, OrderSide } from '../../types';
import { database } from '../../database/DatabaseManager';
import { logger } from '../../utils/logger';

/**
 * PositionManager - Manages position state and calculations
 * 
 * Responsibilities:
 * - Track positions per market/outcome
 * - Calculate PnL
 * - Update positions after trades
 * - Position math validation
 */
export class PositionManager {
  private static instance: PositionManager;

  private constructor() {}

  public static getInstance(): PositionManager {
    if (!PositionManager.instance) {
      PositionManager.instance = new PositionManager();
    }
    return PositionManager.instance;
  }

  /**
   * Get current position for market/outcome
   */
  async getPosition(marketId: string, outcomeId: string): Promise<Position | null> {
    return await database.getPosition(marketId, outcomeId);
  }

  /**
   * Get all positions
   */
  async getAllPositions(): Promise<Position[]> {
    return await database.getAllPositions();
  }

  /**
   * Update position after a trade execution
   */
  async updatePosition(
    marketId: string,
    outcomeId: string,
    side: OrderSide,
    quantity: number,
    price: number
  ): Promise<Position> {
    const positionId = `${marketId}:${outcomeId}`;
    const existingPosition = await this.getPosition(marketId, outcomeId);

    let newPosition: Position;

    if (side === OrderSide.BUY) {
      if (existingPosition) {
        // Add to existing position
        const totalQuantity = existingPosition.quantity + quantity;
        const totalCost = existingPosition.quantity * existingPosition.averagePrice + quantity * price;
        const newAveragePrice = totalCost / totalQuantity;

        newPosition = {
          ...existingPosition,
          quantity: totalQuantity,
          averagePrice: newAveragePrice,
          currentPrice: price,
          lastUpdated: new Date(),
        };
      } else {
        // Create new position
        newPosition = {
          id: positionId,
          marketId,
          outcomeId,
          quantity,
          averagePrice: price,
          currentPrice: price,
          unrealizedPnL: 0,
          realizedPnL: 0,
          lastUpdated: new Date(),
        };
      }
    } else {
      // SELL
      if (!existingPosition) {
        throw new Error(`Cannot sell: No position exists for ${positionId}`);
      }

      if (existingPosition.quantity < quantity) {
        throw new Error(
          `Cannot sell: Insufficient quantity. Have ${existingPosition.quantity}, trying to sell ${quantity}`
        );
      }

      // Calculate realized PnL for sold quantity
      const realizedPnL = (price - existingPosition.averagePrice) * quantity;
      const remainingQuantity = existingPosition.quantity - quantity;

      newPosition = {
        ...existingPosition,
        quantity: remainingQuantity,
        currentPrice: price,
        realizedPnL: existingPosition.realizedPnL + realizedPnL,
        lastUpdated: new Date(),
      };
    }

    // Calculate unrealized PnL
    newPosition.unrealizedPnL = 
      (newPosition.currentPrice - newPosition.averagePrice) * newPosition.quantity;

    // Save to database
    await database.savePosition(newPosition);

    logger.info(`Position updated: ${positionId}`, {
      quantity: newPosition.quantity,
      averagePrice: newPosition.averagePrice,
      unrealizedPnL: newPosition.unrealizedPnL,
      realizedPnL: newPosition.realizedPnL,
    });

    return newPosition;
  }

  /**
   * Update position prices (for PnL calculation)
   */
  async updatePositionPrice(marketId: string, outcomeId: string, currentPrice: number): Promise<void> {
    const position = await this.getPosition(marketId, outcomeId);
    
    if (!position) {
      return; // No position to update
    }

    position.currentPrice = currentPrice;
    position.unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity;
    position.lastUpdated = new Date();

    await database.savePosition(position);
  }

  /**
   * Calculate total exposure across all positions
   */
  async getTotalExposure(): Promise<number> {
    const positions = await this.getAllPositions();
    let totalExposure = 0;

    for (const position of positions) {
      totalExposure += position.quantity * position.currentPrice;
    }

    return totalExposure;
  }

  /**
   * Calculate total PnL
   */
  async getTotalPnL(): Promise<{ realized: number; unrealized: number; total: number }> {
    const positions = await this.getAllPositions();
    
    let realizedPnL = 0;
    let unrealizedPnL = 0;

    for (const position of positions) {
      realizedPnL += position.realizedPnL;
      unrealizedPnL += position.unrealizedPnL;
    }

    return {
      realized: realizedPnL,
      unrealized: unrealizedPnL,
      total: realizedPnL + unrealizedPnL,
    };
  }

  /**
   * Get position size for a market/outcome
   */
  async getPositionSize(marketId: string, outcomeId: string): Promise<number> {
    const position = await this.getPosition(marketId, outcomeId);
    return position ? position.quantity : 0;
  }

  /**
   * Check if we can take a position of given size
   */
  async canTakePosition(
    marketId: string,
    outcomeId: string,
    side: OrderSide,
    quantity: number
  ): Promise<{ canTake: boolean; reason?: string }> {
    if (side === OrderSide.SELL) {
      const currentPosition = await this.getPositionSize(marketId, outcomeId);
      if (currentPosition < quantity) {
        return {
          canTake: false,
          reason: `Insufficient position: have ${currentPosition}, trying to sell ${quantity}`,
        };
      }
    }

    return { canTake: true };
  }
}

export const positionManager = PositionManager.getInstance();
