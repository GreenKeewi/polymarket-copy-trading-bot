import { PriceSnapshot } from '../types';
import { logger } from '../utils/logger';

/**
 * PriceSimulator - Simulates market prices for testing
 * 
 * Supports:
 * - Random walk price generation
 * - Historical price snapshots
 * - Deterministic seeded randomness
 */
export class PriceSimulator {
  private prices: Map<string, number>; // key: marketId:outcomeId
  private priceHistory: Map<string, PriceSnapshot[]>;
  private volatility: number;
  private random: () => number;

  constructor(volatility: number = 0.02, seed?: number) {
    this.prices = new Map();
    this.priceHistory = new Map();
    this.volatility = volatility;

    // Use seeded random for deterministic testing
    if (seed !== undefined) {
      this.random = this.seededRandom(seed);
      logger.info(`PriceSimulator: Using deterministic seed ${seed}`);
    } else {
      this.random = Math.random;
    }
  }

  /**
   * Initialize with default prices
   */
  async initialize(): Promise<void> {
    logger.info('PriceSimulator initialized');
  }

  /**
   * Get current price for market/outcome
   */
  public getPrice(marketId: string, outcomeId: string): number {
    const key = this.getKey(marketId, outcomeId);
    let price = this.prices.get(key);

    if (!price) {
      // Initialize with random price between 0.3 and 0.7
      price = 0.3 + this.random() * 0.4;
      this.setPrice(marketId, outcomeId, price);
    }

    return price;
  }

  /**
   * Set price for market/outcome
   */
  public setPrice(marketId: string, outcomeId: string, price: number): void {
    const key = this.getKey(marketId, outcomeId);
    
    // Clamp price between 0.01 and 0.99 (realistic prediction market bounds)
    const clampedPrice = Math.max(0.01, Math.min(0.99, price));
    
    this.prices.set(key, clampedPrice);

    // Store in history
    const history = this.priceHistory.get(key) || [];
    history.push({
      marketId,
      outcomeId,
      price: clampedPrice,
      timestamp: new Date(),
    });
    this.priceHistory.set(key, history);
  }

  /**
   * Simulate price movement (random walk)
   */
  public simulatePriceMovement(marketId: string, outcomeId: string): number {
    const currentPrice = this.getPrice(marketId, outcomeId);
    
    // Random walk with volatility
    const change = (this.random() - 0.5) * this.volatility * 2;
    const newPrice = currentPrice + change;
    
    this.setPrice(marketId, outcomeId, newPrice);
    
    return newPrice;
  }

  /**
   * Simulate price movement for all tracked markets
   */
  public simulateAllPrices(): void {
    for (const [key] of this.prices) {
      const [marketId, outcomeId] = key.split(':');
      this.simulatePriceMovement(marketId, outcomeId);
    }
  }

  /**
   * Load historical price snapshots
   */
  public loadHistoricalPrices(snapshots: PriceSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.setPrice(snapshot.marketId, snapshot.outcomeId, snapshot.price);
    }
    logger.info(`Loaded ${snapshots.length} historical price snapshots`);
  }

  /**
   * Get price history for a market/outcome
   */
  public getPriceHistory(marketId: string, outcomeId: string): PriceSnapshot[] {
    const key = this.getKey(marketId, outcomeId);
    return this.priceHistory.get(key) || [];
  }

  /**
   * Get all current prices
   */
  public getAllPrices(): Map<string, number> {
    return new Map(this.prices);
  }

  /**
   * Calculate slippage between requested and current price
   */
  public calculateSlippage(requestedPrice: number, currentPrice: number): number {
    return Math.abs(currentPrice - requestedPrice) / requestedPrice;
  }

  /**
   * Reset all prices
   */
  public reset(): void {
    this.prices.clear();
    this.priceHistory.clear();
    logger.info('PriceSimulator: Reset all prices');
  }

  /**
   * Generate key for market/outcome pair
   */
  private getKey(marketId: string, outcomeId: string): string {
    return `${marketId}:${outcomeId}`;
  }

  /**
   * Seeded random number generator for deterministic testing
   * Uses simple LCG (Linear Congruential Generator)
   * 
   * Parameters are from Numerical Recipes (MINSTD variant):
   * - Multiplier (a): 1664525 - chosen to provide good spectral properties
   * - Increment (c): 1013904223 - must be odd when modulus is power of 2
   * - Modulus (m): 4294967296 (2^32) - fits in 32-bit arithmetic
   * 
   * These constants are well-studied and provide adequate randomness
   * for simulation purposes with full period (2^32 values before repeating).
   */
  private seededRandom(seed: number): () => number {
    const LCG_MULTIPLIER = 1664525;
    const LCG_INCREMENT = 1013904223;
    const LCG_MODULUS = 4294967296; // 2^32
    
    let state = seed;
    return (): number => {
      state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
      return state / LCG_MODULUS;
    };
  }

  /**
   * Simulate realistic market dynamics
   */
  public simulateMarketDynamics(marketId: string, outcomeId: string, event: 'positive' | 'negative' | 'neutral'): void {
    const currentPrice = this.getPrice(marketId, outcomeId);
    let newPrice: number;

    switch (event) {
      case 'positive':
        // Price jumps up 5-15%
        newPrice = currentPrice * (1 + 0.05 + this.random() * 0.1);
        break;
      case 'negative':
        // Price drops 5-15%
        newPrice = currentPrice * (1 - 0.05 - this.random() * 0.1);
        break;
      case 'neutral':
      default:
        // Small random movement
        newPrice = currentPrice + (this.random() - 0.5) * this.volatility;
        break;
    }

    this.setPrice(marketId, outcomeId, newPrice);
    logger.info(`Market dynamics: ${event} event - price ${currentPrice.toFixed(4)} -> ${newPrice.toFixed(4)}`);
  }
}
