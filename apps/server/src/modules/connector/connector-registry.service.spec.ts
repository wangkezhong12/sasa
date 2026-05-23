import { ConnectorRegistry } from './connector-registry.service';
import { DemoConnector } from './connectors/demo';
import { NotFoundException } from '@nestjs/common';

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  it('should register and retrieve a connector', () => {
    const connector = new DemoConnector();
    registry.register('demo', connector);
    expect(registry.get('demo')).toBe(connector);
  });

  it('should list all registered connectors', () => {
    registry.register('demo-1', new DemoConnector());
    registry.register('demo-2', new DemoConnector());
    expect(registry.list()).toHaveLength(2);
  });

  it('should throw NotFoundException when getting unregistered connector', () => {
    expect(() => registry.get('nonexistent')).toThrow(NotFoundException);
  });

  it('should overwrite when registering same id', () => {
    const c1 = new DemoConnector();
    const c2 = new DemoConnector();
    registry.register('demo', c1);
    registry.register('demo', c2);
    expect(registry.get('demo')).toBe(c2);
    expect(registry.list()).toHaveLength(1);
  });

  it('should return empty array for list when empty', () => {
    expect(registry.list()).toHaveLength(0);
  });
});
