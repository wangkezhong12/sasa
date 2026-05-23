import { Injectable } from '@nestjs/common';
import { ConfirmationAction } from '@sasa/shared';
import { DEFAULT_CONFIRMATION_TIMEOUT_SECONDS } from '@sasa/shared';

export interface ConfirmationResult {
  action: ConfirmationAction;
  modifiedParameters?: Record<string, unknown>;
}

@Injectable()
export class ConfirmationManager {
  private pending = new Map<string, { timer: NodeJS.Timeout; resolve: (v: ConfirmationResult) => void }>();

  create(id: string, timeoutMs?: number): Promise<ConfirmationResult> {
    const timeout = timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_SECONDS * 1000;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ action: 'cancel' });
      }, timeout);
      this.pending.set(id, { timer, resolve });
    });
  }

  resolve(id: string, result: ConfirmationResult) {
    const entry = this.pending.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.pending.delete(id);
    entry.resolve(result);
  }

  has(id: string): boolean {
    return this.pending.has(id);
  }

  cancel(id: string) {
    this.resolve(id, { action: 'cancel' });
  }
}
