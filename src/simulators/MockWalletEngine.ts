import { OrderSide, Position } from '../types';
import { logger } from '../utils/logger';

/**
 * MockWalletEngine - Simulated wallet for test mode
 * 
 * This engine:
 * - Tracks fake balance and positions
 * - Enforces same risk rules as live trading
 * - Provides realistic simulation of execution
 * - NEVER touches real money
 */
export class MockWalletEngine {
  private cashBalance: number;
  private positions: Map<string, Position>; // key: marketId:outcomeId
  private tradeHistory: Array<{
    side: OrderSide;
    marketId: string;
    outcomeId: string;
    quantity: number;
    price: number;
    timestamp: Date;
  }>;
  private initialBalance: number;

  constructor(initialBalance: number) {
    this.initialBalance = initialBalance;
    this.cashBalance = initialBalance;
    this.positions = new Map();
    this.tradeHistory = [];

    logger.info(`🧪 MockWallet initialized with $${initialBalance}`);
  }

  /**
   * Execute a BUY order
   */
  public buy(marketId: string, outcomeId: string, quantity: number, price: number): boolean {
    const cost = quantity * price;

    if (cost > this.cashBalance) {
      logger.warn(`MockWallet: Insufficient balance for buy. Need $${cost}, have $${this.cashBalance}`);
      return false;
    }

    // Deduct cash
    this.cashBalance -= cost;

    // Update position
    const positionKey = this.getPositionKey(marketId, outcomeId);
    const existingPosition = this.positions.get(positionKey);

    if (existingPosition) {
      // Update average price
      const totalQuantity = existingPosition.quantity + quantity;
      const totalCost = existingPosition.quantity * existingPosition.averagePrice + cost;
      existingPosition.quantity = totalQuantity;
      existingPosition.averagePrice = totalCost / totalQuantity;
      existingPosition.currentPrice = price;
      existingPosition.lastUpdated = new Date();
    } else {
      // Create new position
      this.positions.set(positionKey, {
        id: positionKey,
        marketId,
        outcomeId,
        quantity,
        averagePrice: price,
        currentPrice: price,
        unrealizedPnL: 0,
        realizedPnL: 0,
        lastUpdated: new Date(),
      });
    }

    this.tradeHistory.push({
      side: OrderSide.BUY,
      marketId,
      outcomeId,
      quantity,
      price,
      timestamp: new Date(),
    });

    logger.info(`MockWallet: BUY ${quantity} @ $${price} (cost: $${cost.toFixed(2)}, remaining: $${this.cashBalance.toFixed(2)})`);

    return true;
  }

  /**
   * Execute a SELL order
   */
  public sell(marketId: string, outcomeId: string, quantity: number, price: number): boolean {
    const positionKey = this.getPositionKey(marketId, outcomeId);
    const position = this.positions.get(positionKey);

    if (!position || position.quantity < quantity) {
      logger.warn(`MockWallet: Insufficient position for sell. Have ${position?.quantity || 0}, trying to sell ${quantity}`);
      return false;
    }

    const proceeds = quantity * price;

    // Calculate realized PnL for sold quantity
    const realizedPnL = (price - position.averagePrice) * quantity;

    // Add cash
    this.cashBalance += proceeds;

    // Update position
    position.quantity -= quantity;
    position.realizedPnL += realizedPnL;
    position.currentPrice = price;
    position.lastUpdated = new Date();

    // Remove position if fully closed
    if (position.quantity === 0) {
      this.positions.delete(positionKey);
    }

    this.tradeHistory.push({
      side: OrderSide.SELL,
      marketId,
      outcomeId,
      quantity,
      price,
      timestamp: new Date(),
    });

    logger.info(`MockWallet: SELL ${quantity} @ $${price} (proceeds: $${proceeds.toFixed(2)}, PnL: $${realizedPnL.toFixed(2)}, balance: $${this.cashBalance.toFixed(2)})`);

    return true;
  }

  /**
   * Update current prices for unrealized PnL calculation
   */
  public updatePrice(marketId: string, outcomeId: string, currentPrice: number): void {
    const positionKey = this.getPositionKey(marketId, outcomeId);
    const position = this.positions.get(positionKey);

    if (position) {
      position.currentPrice = currentPrice;
      position.unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity;
      position.lastUpdated = new Date();
    }
  }

  /**
   * Get current balance information
   */
  public getBalance(): { available: number; total: number; positionsValue: number } {
    const positionsValue = this.calculatePositionsValue();
    const total = this.cashBalance + positionsValue;

    return {
      available: this.cashBalance,
      total,
      positionsValue,
    };
  }

  /**
   * Get specific position
   */
  public getPosition(marketId: string, outcomeId: string): Position | null {
    const positionKey = this.getPositionKey(marketId, outcomeId);
    const position = this.positions.get(positionKey);
    return position ? { ...position } : null;
  }

  /**
   * Get all positions
   */
  public getAllPositions(): Position[] {
    return Array.from(this.positions.values()).map(p => ({ ...p }));
  }

  /**
   * Calculate total PnL
   */
  public getTotalPnL(): { realized: number; unrealized: number; total: number } {
    let realizedPnL = 0;
    let unrealizedPnL = 0;

    for (const position of this.positions.values()) {
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
   * Get trade history
   */
  public getTradeHistory(): Array<{
    side: OrderSide;
    marketId: string;
    outcomeId: string;
    quantity: number;
    price: number;
    timestamp: Date;
  }> {
    return [...this.tradeHistory];
  }

  /**
   * Calculate current value of all positions
   */
  private calculatePositionsValue(): number {
    let total = 0;
    for (const position of this.positions.values()) {
      total += position.quantity * position.currentPrice;
    }
    return total;
  }

  /**
   * Get position key
   */
  private getPositionKey(marketId: string, outcomeId: string): string {
    return `${marketId}:${outcomeId}`;
  }

  /**
   * Reset wallet to initial state (for testing)
   */
  public reset(): void {
    this.cashBalance = this.initialBalance;
    this.positions.clear();
    this.tradeHistory = [];
    logger.info('MockWallet: Reset to initial state');
  }

  /**
   * Get statistics
   */
  public getStats(): {
    initialBalance: number;
    currentBalance: number;
    totalPnL: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  } {
    const balance = this.getBalance();
    
    let winningTrades = 0;
    let losingTrades = 0;

    // Count winning/losing trades from realized PnL
    for (const trade of this.tradeHistory) {
      if (trade.side === OrderSide.SELL) {
        const position = this.getPosition(trade.marketId, trade.outcomeId);
        if (position && position.realizedPnL > 0) {
          winningTrades++;
        } else if (position && position.realizedPnL < 0) {
          losingTrades++;
        }
      }
    }

    return {
      initialBalance: this.initialBalance,
      currentBalance: balance.total,
      totalPnL: balance.total - this.initialBalance,
      totalTrades: this.tradeHistory.length,
      winningTrades,
      losingTrades,
    };
  }
}
