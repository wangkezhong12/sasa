import { Injectable, NotFoundException } from '@nestjs/common';
import type { SaaSConnector } from '@sasa/shared';

@Injectable()
export class ConnectorRegistry {
  private connectors = new Map<string, SaaSConnector>();

  register(id: string, connector: SaaSConnector) {
    this.connectors.set(id, connector);
  }

  get(id: string): SaaSConnector {
    const c = this.connectors.get(id);
    if (!c) throw new NotFoundException(`Connector ${id} not found`);
    return c;
  }

  list(): { id: string; connector: SaaSConnector }[] {
    return Array.from(this.connectors.entries()).map(([id, connector]) => ({ id, connector }));
  }
}
