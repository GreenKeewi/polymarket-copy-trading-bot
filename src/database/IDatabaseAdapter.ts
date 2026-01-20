import {
  Trade,
  ExecutionOrder,
  Position,
} from '../types';

/**
 * IDatabaseAdapter - Common interface for database operations
 * Implemented by both MongoDB and InMemory adapters
 */
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  saveTrade(trade: Trade): Promise<void>;
  saveExecutionOrder(order: ExecutionOrder): Promise<void>;
  updateExecutionOrder(orderId: string, updates: Partial<ExecutionOrder>): Promise<void>;
  getExecutionOrder(orderId: string): Promise<ExecutionOrder | null>;
  isTradeProcessed(tradeId: string): Promise<boolean>;
  savePosition(position: Position): Promise<void>;
  getPosition(marketId: string, outcomeId: string): Promise<Position | null>;
  getAllPositions(): Promise<Position[]>;
  getRecentTrades(limit?: number): Promise<Trade[]>;
  getRecentExecutionOrders(limit?: number): Promise<ExecutionOrder[]>;
  clearAllData(): Promise<void>;
}
