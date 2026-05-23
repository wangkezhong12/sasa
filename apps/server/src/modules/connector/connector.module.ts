import { Module } from '@nestjs/common';
import { ConnectorRegistry } from './connector-registry.service';
import { DemoConnector } from './connectors/demo';

@Module({
  providers: [
    ConnectorRegistry,
    {
      provide: 'DEMO_CONNECTOR',
      useFactory: (registry: ConnectorRegistry) => {
        // DemoConnector is for development only — skip in production
        if (process.env.NODE_ENV === 'production') return null;
        const connector = new DemoConnector();
        registry.register('demo', connector);
        return connector;
      },
      inject: [ConnectorRegistry],
    },
  ],
  exports: [ConnectorRegistry],
})
export class ConnectorModule {}
