import { describe, it, expect } from 'vitest';
import {
  calculateFees,
  PLATFORM_FEE_RATE,
  OZOW_EFT_FEE_RATE,
  OZOW_MIN_FEE,
} from './fees';

describe('calculateFees', () => {
  describe('standard calculation', () => {
    it('returns correct breakdown for R450 service', () => {
      const result = calculateFees(450);

      expect(result.servicePrice).toBe(450);
      expect(result.platformFee).toBe(45);
      expect(result.subtotal).toBe(495);
      expect(result.transactionFee).toBe(7.43);
      expect(result.totalCharged).toBe(502.43);
      expect(result.providerPayout).toBe(450);
      expect(result.onserveRevenue).toBe(45);
    });

    it('handles R100 service correctly', () => {
      const result = calculateFees(100);

      expect(result.servicePrice).toBe(100);
      expect(result.platformFee).toBe(10);
      expect(result.subtotal).toBe(110);
      expect(result.transactionFee).toBe(1.65); // 110 * 0.015 = 1.65
      expect(result.totalCharged).toBe(111.65);
      expect(result.providerPayout).toBe(100);
      expect(result.onserveRevenue).toBe(10);
    });

    it('handles R1000 service correctly', () => {
      const result = calculateFees(1000);

      expect(result.servicePrice).toBe(1000);
      expect(result.platformFee).toBe(100);
      expect(result.subtotal).toBe(1100);
      expect(result.transactionFee).toBe(16.50); // 1100 * 0.015 = 16.5
      expect(result.totalCharged).toBe(1116.50);
      expect(result.providerPayout).toBe(1000);
      expect(result.onserveRevenue).toBe(100);
    });
  });

  describe('minimum Ozow fee', () => {
    it('applies minimum R1 Ozow fee on small amounts', () => {
      const result = calculateFees(10);

      expect(result.servicePrice).toBe(10);
      expect(result.platformFee).toBe(1); // 10 * 0.10 = 1
      expect(result.subtotal).toBe(11);
      // 11 * 0.015 = 0.165, but minimum is R1.00
      expect(result.transactionFee).toBe(1.00);
      expect(result.totalCharged).toBe(12); // 10 + 1 + 1.00
    });

    it('applies minimum fee on R5 service', () => {
      const result = calculateFees(5);

      expect(result.servicePrice).toBe(5);
      expect(result.platformFee).toBe(0.50);
      expect(result.subtotal).toBe(5.50);
      // 5.50 * 0.015 = 0.0825, but minimum is R1.00
      expect(result.transactionFee).toBe(1.00);
      expect(result.totalCharged).toBe(6.50);
    });

    it('applies minimum fee on R1 service', () => {
      const result = calculateFees(1);

      expect(result.servicePrice).toBe(1);
      expect(result.platformFee).toBe(0.10);
      expect(result.subtotal).toBe(1.10);
      // 1.10 * 0.015 = 0.0165, but minimum is R1.00
      expect(result.transactionFee).toBe(1.00);
      expect(result.totalCharged).toBe(2.10);
    });

    it('does not apply minimum fee when calculated fee exceeds it', () => {
      const result = calculateFees(70);

      expect(result.servicePrice).toBe(70);
      expect(result.platformFee).toBe(7);
      expect(result.subtotal).toBe(77);
      // 77 * 0.015 = 1.155, which exceeds minimum, rounds to 1.16
      expect(result.transactionFee).toBe(1.16);
      expect(result.totalCharged).toBe(78.16); // 70 + 7 + 1.16
    });
  });

  describe('edge cases', () => {
    it('handles zero service price', () => {
      const result = calculateFees(0);

      expect(result.servicePrice).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.transactionFee).toBe(1.00); // minimum applies
      expect(result.totalCharged).toBe(1.00);
      expect(result.providerPayout).toBe(0);
      expect(result.onserveRevenue).toBe(0);
    });

    it('throws or handles negative service price gracefully', () => {
      // Depending on implementation, this should either throw or return 0
      // For now, testing the current behavior (which calculates with negative)
      const result = calculateFees(-100);

      // Negative price would result in negative platformFee and subtotal
      expect(result.servicePrice).toBe(-100);
      expect(result.platformFee).toBe(-10);
      expect(result.subtotal).toBe(-110);
      // max(-110 * 0.015, 1.00) = max(-1.65, 1.00) = 1.00
      expect(result.transactionFee).toBe(1.00);
    });

    it('handles decimal amounts with proper rounding', () => {
      const result = calculateFees(123.45);

      expect(result.servicePrice).toBe(123.45);
      expect(result.platformFee).toBe(12.35); // 123.45 * 0.10 = 12.345 → 12.35
      expect(result.subtotal).toBe(135.80);
      // 135.80 * 0.015 = 2.037 → 2.04
      expect(result.transactionFee).toBe(2.04);
      expect(result.totalCharged).toBe(137.84);
    });

    it('handles very large amounts', () => {
      const result = calculateFees(50000);

      expect(result.servicePrice).toBe(50000);
      expect(result.platformFee).toBe(5000);
      expect(result.subtotal).toBe(55000);
      expect(result.transactionFee).toBe(825); // 55000 * 0.015 = 825
      expect(result.totalCharged).toBe(55825);
      expect(result.providerPayout).toBe(50000);
      expect(result.onserveRevenue).toBe(5000);
    });
  });

  describe('fee structure invariants', () => {
    it('platformFee is exactly 10% of servicePrice', () => {
      const testAmounts = [10, 50, 100, 450, 1000, 5000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        const expected = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
        expect(result.platformFee).toBe(expected);
      });
    });

    it('providerPayout equals servicePrice', () => {
      const testAmounts = [10, 50, 100, 450, 1000, 5000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        expect(result.providerPayout).toBe(result.servicePrice);
      });
    });

    it('onserveRevenue equals platformFee', () => {
      const testAmounts = [10, 50, 100, 450, 1000, 5000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        expect(result.onserveRevenue).toBe(result.platformFee);
      });
    });

    it('totalCharged = servicePrice + platformFee + transactionFee', () => {
      const testAmounts = [10, 50, 100, 450, 1000, 5000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        const calculated = result.servicePrice + result.platformFee + result.transactionFee;
        // Account for floating point rounding
        expect(Math.abs(result.totalCharged - calculated)).toBeLessThan(0.01);
      });
    });

    it('subtotal = servicePrice + platformFee', () => {
      const testAmounts = [10, 50, 100, 450, 1000, 5000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        expect(result.subtotal).toBe(result.servicePrice + result.platformFee);
      });
    });

    it('transactionFee is at least OZOW_MIN_FEE', () => {
      const testAmounts = [1, 5, 10, 20, 50];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        expect(result.transactionFee).toBeGreaterThanOrEqual(OZOW_MIN_FEE);
      });
    });

    it('transactionFee is either min fee or subtotal * rate', () => {
      const testAmounts = [1, 10, 70, 450, 1000, 5000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        const calculatedRate = Math.round(result.subtotal * OZOW_EFT_FEE_RATE * 100) / 100;
        const expected = Math.max(calculatedRate, OZOW_MIN_FEE);
        expect(result.transactionFee).toBe(expected);
      });
    });
  });

  describe('return type structure', () => {
    it('returns complete FeeBreakdown object with all required fields', () => {
      const result = calculateFees(100);

      expect(result).toHaveProperty('servicePrice');
      expect(result).toHaveProperty('platformFee');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('transactionFee');
      expect(result).toHaveProperty('totalCharged');
      expect(result).toHaveProperty('providerPayout');
      expect(result).toHaveProperty('onserveRevenue');

      // All fields should be numbers
      expect(typeof result.servicePrice).toBe('number');
      expect(typeof result.platformFee).toBe('number');
      expect(typeof result.subtotal).toBe('number');
      expect(typeof result.transactionFee).toBe('number');
      expect(typeof result.totalCharged).toBe('number');
      expect(typeof result.providerPayout).toBe('number');
      expect(typeof result.onserveRevenue).toBe('number');
    });

    it('all monetary values are non-negative', () => {
      const testAmounts = [1, 10, 100, 450, 1000];

      testAmounts.forEach(amount => {
        const result = calculateFees(amount);
        expect(result.servicePrice).toBeGreaterThanOrEqual(0);
        expect(result.platformFee).toBeGreaterThanOrEqual(0);
        expect(result.subtotal).toBeGreaterThanOrEqual(0);
        expect(result.transactionFee).toBeGreaterThanOrEqual(0);
        expect(result.totalCharged).toBeGreaterThanOrEqual(0);
        expect(result.providerPayout).toBeGreaterThanOrEqual(0);
        expect(result.onserveRevenue).toBeGreaterThanOrEqual(0);
      });
    });

    it('all monetary values are rounded to 2 decimal places', () => {
      const result = calculateFees(123.45);

      const hasMaxTwoDecimals = (value: number) => {
        const str = value.toString();
        const decimalIndex = str.indexOf('.');
        if (decimalIndex === -1) return true;
        return str.length - decimalIndex - 1 <= 2;
      };

      expect(hasMaxTwoDecimals(result.servicePrice)).toBe(true);
      expect(hasMaxTwoDecimals(result.platformFee)).toBe(true);
      expect(hasMaxTwoDecimals(result.subtotal)).toBe(true);
      expect(hasMaxTwoDecimals(result.transactionFee)).toBe(true);
      expect(hasMaxTwoDecimals(result.totalCharged)).toBe(true);
      expect(hasMaxTwoDecimals(result.providerPayout)).toBe(true);
      expect(hasMaxTwoDecimals(result.onserveRevenue)).toBe(true);
    });
  });
});
