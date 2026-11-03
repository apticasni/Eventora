import { describe, expect, it } from 'vitest';
import { resolveIsFree } from '../src/lib/eventPricing';

describe('event pricing updates', () => {
  it('preserves the current free status when pricing fields are omitted', () => {
    expect(resolveIsFree(true, {})).toBe(true);
    expect(resolveIsFree(false, {})).toBe(false);
  });

  it('updates free status when price or the explicit flag changes', () => {
    expect(resolveIsFree(true, { price: 250 })).toBe(false);
    expect(resolveIsFree(false, { price: 0 })).toBe(true);
    expect(resolveIsFree(false, { isFree: true })).toBe(true);
  });
});
