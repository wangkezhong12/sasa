import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

/** Minimal OpenAPI spec for testing schema upload */
export const SAMPLE_OPENAPI_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Test ERP', version: '1.0.0' },
  paths: {
    '/leaves': {
      post: {
        operationId: 'submit_leave',
        summary: 'Submit leave request',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['annual', 'sick'] },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                },
                required: ['type', 'startDate', 'endDate'],
              },
            },
          },
        },
        responses: { '200': { description: 'OK' } },
      },
    },
    '/leaves/balance': {
      get: {
        operationId: 'query_leave_balance',
        summary: 'Query leave balance',
        parameters: [
          { name: 'year', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/expenses': {
      delete: {
        operationId: 'delete_expense',
        summary: 'Delete expense record',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
});

/** Upload a schema and publish the connector, return connectorId */
export async function createPublishedConnector(
  app: INestApplication,
  token: string,
  workspaceId?: string,
): Promise<string> {
  const uploadRes = await request(app.getHttpServer())
    .post('/schemas/upload')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Test ERP ${Date.now()}`,
      schema: SAMPLE_OPENAPI_SPEC,
      workspaceId: workspaceId || undefined,
    });

  const connectorId = uploadRes.body.id;

  await request(app.getHttpServer())
    .post(`/schemas/connectors/${connectorId}/publish`)
    .set('Authorization', `Bearer ${token}`);

  return connectorId;
}

/** Create workspace, return workspace object */
export async function createWorkspace(
  app: INestApplication,
  token: string,
  name?: string,
) {
  const res = await request(app.getHttpServer())
    .post('/workspaces')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: name || `Workspace ${Date.now()}` });
  return res.body;
}
