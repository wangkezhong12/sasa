import { Injectable } from '@nestjs/common';
import { ConfirmationAction } from '@sasa/shared';
import { DEFAULT_CONFIRMATION_TIMEOUT_SECONDS } from '@sasa/shared';

export interface ConfirmationResult {
  action: ConfirmationAction;
  modifiedParameters?: Record<string, unknown>;
}

interface PendingEntry {
  timer: NodeJS.Timeout;
  resolve: (v: ConfirmationResult) => void;
  userId: string;
}

@Injectable()
export class ConfirmationManager {
  private pending = new Map<string, PendingEntry>();
  private static readonly MAX_PENDING = 1000;

  /** Generate a unique confirmation ID */
  createId(): string {
    return `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Register a pending confirmation without awaiting — used when returning confirmation_required to client */
  register(id: string, userId: string, timeoutMs?: number): void {
    if (this.pending.has(id)) {
      throw new Error(`Confirmation ${id} already exists`);
    }
    if (this.pending.size >= ConfirmationManager.MAX_PENDING) {
      throw new Error('Too many pending confirmations');
    }
    const timeout = timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_SECONDS * 1000;
    const timer = setTimeout(() => {
      this.pending.delete(id);
    }, timeout);
    this.pending.set(id, { timer, resolve: () => {}, userId });
  }

  /** Create a pending confirmation that resolves when user responds or timeout expires */
  create(id: string, userId: string, timeoutMs?: number): Promise<ConfirmationResult> {
    if (this.pending.has(id)) {
      throw new Error(`Confirmation ${id} already exists`);
    }
    if (this.pending.size >= ConfirmationManager.MAX_PENDING) {
      throw new Error('Too many pending confirmations');
    }
    const timeout = timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_SECONDS * 1000;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ action: 'cancel' });
      }, timeout);
      this.pending.set(id, { timer, resolve, userId });
    });
  }

  resolve(id: string, result: ConfirmationResult) {
    const entry = this.pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(id);
    entry.resolve(result);
  }

  /** Check if confirmation exists and belongs to the given user */
  verifyOwnership(id: string, userId: string): boolean {
    const entry = this.pending.get(id);
    return !!entry && entry.userId === userId;
  }

  has(id: string): boolean {
    return this.pending.has(id);
  }

  cancel(id: string) {
    this.resolve(id, { action: 'cancel' });
  }
}
