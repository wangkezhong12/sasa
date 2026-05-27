import { BaseRestConnector } from '@sasa/connector-sdk';
import type { ConnectorToolDefinition, AuthType, AuthStrategyConfig } from '@sasa/shared';

export class DemoConnector extends BaseRestConnector {
  name = 'Demo ERP';
  version = '1.0.0';
  supportedAuthTypes: AuthType[] = ['api_key'];

  getBaseUrl() {
    return 'https://demo-erp.example.com/api';
  }

  getToolDefinitions(): ConnectorToolDefinition[] {
    return [
      {
        name: 'submit_leave',
        displayName: '提交请假申请',
        description: '提交一个请假申请到 ERP 系统',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['annual', 'sick', 'personal'], description: '假期类型' },
            startDate: { type: 'string', format: 'date', description: '开始日期' },
            endDate: { type: 'string', format: 'date', description: '结束日期' },
            reason: { type: 'string', description: '请假原因' },
          },
          required: ['type', 'startDate', 'endDate'],
        },
        requiredPermission: 'leave:submit',
        riskLevel: 'write',
        apiMapping: { method: 'POST', path: '/leaves' },
      },
      {
        name: 'query_leave_balance',
        displayName: '查询假期余额',
        description: '查询当前用户的假期余额',
        parameters: { type: 'object', properties: {} },
        requiredPermission: 'leave:view',
        riskLevel: 'read',
        apiMapping: { method: 'GET', path: '/leaves/balance' },
      },
    ];
  }

  getAuthStrategyConfig(authType: AuthType): AuthStrategyConfig | undefined {
    if (authType === 'api_key') {
      return { type: 'api_key', params: {} };
    }
    return undefined;
  }
}
