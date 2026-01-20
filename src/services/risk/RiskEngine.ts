import { ExecutionOrder, OrderSide, SlippageCheckResult } from '../../types';
import { config } from '../../config/ConfigManager';
import { positionManager } from '../position/PositionManager';
import { logger } from '../../utils/logger';
import { ExecutorFactory } from '../executor/ExecutorFactory';

/**
 * RiskEngine - Validates trades against risk limits
 * 
 * Enforces:
 * - Position size limits
 * - Total exposure limits
 * - Slippage protection
 * - Minimum trade size
 */
export class RiskEngine {
  private static instance: RiskEngine;

  private constructor() {}

  public static getInstance(): RiskEngine {
    if (!RiskEngine.instance) {
      RiskEngine.instance = new RiskEngine();
    }
    return RiskEngine.instance;
  }

  /**
   * Validate order against all risk rules
   */
  async validateOrder(order: ExecutionOrder): Promise<{ valid: boolean; reason?: string }> {
    const botConfig = config.getConfig();

    // Check minimum trade size
    const orderValue = order.requestedSize * order.requestedPrice;
    if (orderValue < botConfig.risk.minTradeSizeUSD) {
      return {
        valid: false,
        reason: `Order value $${orderValue.toFixed(2)} below minimum $${botConfig.risk.minTradeSizeUSD}`,
      };
    }

    // Check position size limit
    if (botConfig.enableExposureLimits) {
      const positionSizeCheck = await this.checkPositionSizeLimit(order);
      if (!positionSizeCheck.valid) {
        return positionSizeCheck;
      }

      // Check total exposure limit
      const exposureCheck = await this.checkTotalExposureLimit(order);
      if (!exposureCheck.valid) {
        return exposureCheck;
      }
    }

    // Check slippage protection
    if (botConfig.enableSlippageProtection) {
      const slippageCheck = await this.checkSlippage(order);
      if (!slippageCheck.allowed) {
        return {
          valid: false,
          reason: slippageCheck.reason,
        };
      }
    }

    // Check if we have sufficient balance/position
    const executor = await ExecutorFactory.getExecutor();
    const canExecute = await executor.canExecute(order);
    if (!canExecute.canExecute) {
      return {
        valid: false,
        reason: canExecute.reason,
      };
    }

    return { valid: true };
  }

  /**
   * Check position size limit
   */
  private async checkPositionSizeLimit(order: ExecutionOrder): Promise<{ valid: boolean; reason?: string }> {
    const botConfig = config.getConfig();
    
    if (order.side === OrderSide.SELL) {
      return { valid: true }; // Selling reduces position, always OK
    }

    const currentPosition = await positionManager.getPositionSize(order.marketId, order.outcomeId);
    const newPositionSize = currentPosition + order.requestedSize;
    const newPositionValue = newPositionSize * order.requestedPrice;

    if (newPositionValue > botConfig.risk.maxPositionSizeUSD) {
      return {
        valid: false,
        reason: `Position size limit exceeded: $${newPositionValue.toFixed(2)} > $${botConfig.risk.maxPositionSizeUSD}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check total exposure limit
   */
  private async checkTotalExposureLimit(order: ExecutionOrder): Promise<{ valid: boolean; reason?: string }> {
    const botConfig = config.getConfig();
    
    if (order.side === OrderSide.SELL) {
      return { valid: true }; // Selling reduces exposure, always OK
    }

    const currentExposure = await positionManager.getTotalExposure();
    const orderExposure = order.requestedSize * order.requestedPrice;
    const newTotalExposure = currentExposure + orderExposure;

    if (newTotalExposure > botConfig.risk.maxTotalExposureUSD) {
      return {
        valid: false,
        reason: `Total exposure limit exceeded: $${newTotalExposure.toFixed(2)} > $${botConfig.risk.maxTotalExposureUSD}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check slippage protection
   */
  async checkSlippage(order: ExecutionOrder): Promise<SlippageCheckResult> {
    const botConfig = config.getConfig();
    const executor = await ExecutorFactory.getExecutor();

    // Get current market price
    // In test mode, this uses price simulator
    // In live mode, this would query Polymarket API
    let currentPrice: number;
    
    if (config.isTestMode()) {
      // Get from mock executor's price simulator
      const mockExecutor = executor as any;
      if (mockExecutor.getPriceSimulator) {
        currentPrice = mockExecutor.getPriceSimulator().getPrice(order.marketId, order.outcomeId);
      } else {
        currentPrice = order.requestedPrice; // Fallback
      }
    } else {
      // In live mode, would fetch from Polymarket API
      currentPrice = order.requestedPrice; // Placeholder
    }

    const slippagePercent = Math.abs(currentPrice - order.requestedPrice) / order.requestedPrice;

    if (slippagePercent > botConfig.risk.maxSlippageTolerance) {
      logger.warn(`Slippage check failed: ${(slippagePercent * 100).toFixed(2)}% > ${(botConfig.risk.maxSlippageTolerance * 100).toFixed(2)}%`);
      
      return {
        allowed: false,
        requestedPrice: order.requestedPrice,
        currentPrice,
        slippagePercent,
        reason: `Slippage ${(slippagePercent * 100).toFixed(2)}% exceeds limit ${(botConfig.risk.maxSlippageTolerance * 100).toFixed(2)}%`,
      };
    }

    return {
      allowed: true,
      requestedPrice: order.requestedPrice,
      currentPrice,
      slippagePercent,
    };
  }

  /**
   * Calculate safe position size based on multiplier and limits
   */
  calculateSafePositionSize(
    originalSize: number,
    multiplier: number,
    currentPrice: number
  ): number {
    const botConfig = config.getConfig();
    
    // Apply multiplier
    let adjustedSize = originalSize * multiplier;
    
    // Ensure doesn't exceed max position size
    const maxSizeByValue = botConfig.risk.maxPositionSizeUSD / currentPrice;
    adjustedSize = Math.min(adjustedSize, maxSizeByValue);
    
    // Ensure meets minimum trade size
    const minSizeByValue = botConfig.risk.minTradeSizeUSD / currentPrice;
    if (adjustedSize < minSizeByValue) {
      return 0; // Trade too small, skip
    }

    return adjustedSize;
  }
}

export const riskEngine = RiskEngine.getInstance();
