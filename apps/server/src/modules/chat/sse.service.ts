import { Injectable } from '@nestjs/common';
import { Subject, Observable, map, finalize } from 'rxjs';

export interface SSEEvent {
  event: string;
  data: string;
}

@Injectable()
export class SSEService {
  private clients = new Map<string, Subject<SSEEvent>>();

  createStream(clientId: string): Observable<MessageEvent> {
    // Complete existing connection if client reconnects
    const existing = this.clients.get(clientId);
    if (existing) {
      existing.complete();
    }
    const subject = new Subject<SSEEvent>();
    this.clients.set(clientId, subject);
    return subject.asObservable().pipe(
      map(({ event, data }) => new MessageEvent(event, { data })),
      finalize(() => this.clients.delete(clientId)),
    );
  }

  push(clientId: string, event: SSEEvent) {
    const subject = this.clients.get(clientId);
    if (!subject) return;
    subject.next(event);
  }

  complete(clientId: string) {
    const subject = this.clients.get(clientId);
    if (!subject) return;
    subject.complete();
    // finalize in createStream will handle the Map cleanup
  }

  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
