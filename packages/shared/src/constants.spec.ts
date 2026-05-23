import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIRMATION_TIMEOUT_SECONDS,
  MAX_TOOL_CALL_STEPS,
  CONTEXT_WINDOW_RECENT_ROUNDS,
  CONTEXT_WINDOW_BUDGET_RATIO,
  TOOL_DEFINITION_THRESHOLD,
  PERMISSION_CACHE_TTL_SECONDS,
  RATE_LIMIT_USER_PER_MIN,
  RATE_LIMIT_WORKSPACE_PER_MIN,
  AUDIT_LOG_RETENTION_DAYS,
} from './constants';

describe('constants', () => {
  it('should have correct confirmation timeout (5 min)', () => {
    expect(DEFAULT_CONFIRMATION_TIMEOUT_SECONDS).toBe(300);
  });

  it('should have max tool call steps of 5', () => {
    expect(MAX_TOOL_CALL_STEPS).toBe(5);
  });

  it('should have context window budget ratio of 0.8', () => {
    expect(CONTEXT_WINDOW_BUDGET_RATIO).toBe(0.8);
  });

  it('should have permission cache TTL of 30 minutes', () => {
    expect(PERMISSION_CACHE_TTL_SECONDS).toBe(1800);
  });

  it('should have rate limit values', () => {
    expect(RATE_LIMIT_USER_PER_MIN).toBe(20);
    expect(RATE_LIMIT_WORKSPACE_PER_MIN).toBe(100);
  });

  it('should have audit log retention of 90 days', () => {
    expect(AUDIT_LOG_RETENTION_DAYS).toBe(90);
  });
});
