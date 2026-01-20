import { ExecutionOrder, ExecutionResult } from '../../types';

/**
 * IExecutor - Common interface for both Live and Mock execution engines
 * This ensures test and live modes share the same contract
 */
export interface IExecutor {
  /**
   * Execute a single order
   */
  executeOrder(order: ExecutionOrder): Promise<ExecutionResult>;

  /**
   * Get current balance information
   */
  getBalance(): Promise<{ available: number; total: number }>;

  /**
   * Get current position for a specific market/outcome
   */
  getPosition(marketId: string, outcomeId: string): Promise<{ quantity: number; averagePrice: number } | null>;

  /**
   * Get current market price for a specific market/outcome
   * In test mode, returns simulated price
   * In live mode, would query Polymarket API
   */
  getCurrentPrice(marketId: string, outcomeId: string): Promise<number>;

  /**
   * Validate if an order can be executed (pre-flight check)
   */
  canExecute(order: ExecutionOrder): Promise<{ canExecute: boolean; reason?: string }>;

  /**
   * Get executor type for safety checks
   */
  getType(): 'LIVE' | 'MOCK';

  /**
   * Initialize the executor
   */
  initialize(): Promise<void>;

  /**
   * Cleanup and shutdown
   */
  shutdown(): Promise<void>;
}
