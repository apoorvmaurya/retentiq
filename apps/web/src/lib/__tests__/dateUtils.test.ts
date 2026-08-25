import { describe, it, expect, vi, afterEach } from 'vitest';
import { timeAgo, formatLocaleDate } from '../dateUtils';

describe('Date Utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeAgo', () => {
    it('should return "Just now" for null, undefined, or empty string', () => {
      expect(timeAgo(null)).toBe('Just now');
      expect(timeAgo(undefined)).toBe('Just now');
      expect(timeAgo('')).toBe('Just now');
      expect(timeAgo('invalid-date')).toBe('Just now');
    });

    it('should return relative minutes ago', () => {
      const now = new Date('2026-08-25T12:00:00Z').getTime();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const fiveMinsAgo = new Date('2026-08-25T11:55:00Z').toISOString();
      expect(timeAgo(fiveMinsAgo)).toBe('5m ago');
    });

    it('should return relative hours ago', () => {
      const now = new Date('2026-08-25T12:00:00Z').getTime();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const threeHoursAgo = new Date('2026-08-25T09:00:00Z').toISOString();
      expect(timeAgo(threeHoursAgo)).toBe('3h ago');
    });

    it('should return relative days ago', () => {
      const now = new Date('2026-08-25T12:00:00Z').getTime();
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const twoDaysAgo = new Date('2026-08-23T12:00:00Z').toISOString();
      expect(timeAgo(twoDaysAgo)).toBe('2d ago');
    });
  });

  describe('formatLocaleDate', () => {
    it('should return empty string for null, undefined, or invalid date', () => {
      expect(formatLocaleDate(null)).toBe('');
      expect(formatLocaleDate(undefined)).toBe('');
      expect(formatLocaleDate('not-a-date')).toBe('');
    });

    it('should format valid date string properly', () => {
      const formatted = formatLocaleDate('2026-10-15T00:00:00Z');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });
});
