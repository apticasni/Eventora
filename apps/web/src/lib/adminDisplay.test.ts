import { describe, expect, it } from 'vitest';
import { getAdminStatusPresentation } from './adminDisplay';

describe('getAdminStatusPresentation', () => {
  it('formats known statuses and assigns their visual tone', () => {
    expect(getAdminStatusPresentation('IN_PROGRESS')).toEqual({
      label: 'IN PROGRESS',
      tone: 'caution',
    });
    expect(getAdminStatusPresentation('active')).toEqual({
      label: 'ACTIVE',
      tone: 'positive',
    });
  });

  it.each([undefined, null, '', 42, {}])('safely labels unexpected status values', (value) => {
    expect(getAdminStatusPresentation(value)).toEqual({
      label: 'UNKNOWN',
      tone: 'neutral',
    });
  });
});
