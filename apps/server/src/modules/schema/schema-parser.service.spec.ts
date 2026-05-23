import { BadRequestException } from '@nestjs/common';
import { SchemaParserService } from './schema-parser.service';

describe('SchemaParserService', () => {
  let parser: SchemaParserService;

  beforeEach(() => {
    parser = new SchemaParserService();
  });

  const validSpec = {
    openapi: '3.0.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          summary: 'List pets',
          parameters: [],
          responses: { '200': { description: 'OK' } },
        },
        post: {
          operationId: 'createPet',
          summary: 'Create a pet',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string' } },
                  required: ['name'],
                },
              },
            },
          },
          responses: { '201': { description: 'Created' } },
        },
      },
      '/pets/{id}': {
        delete: {
          summary: 'Delete a pet',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '204': { description: 'Deleted' } },
        },
      },
    },
  };

  it('should parse a valid OpenAPI 3.0 document', () => {
    const result = parser.parse(JSON.stringify(validSpec));
    expect(result.tools).toHaveLength(3);
    expect(result.tools[0].name).toBe('listPets');
    expect(result.tools[0].riskLevel).toBe('read');
    expect(result.tools[1].riskLevel).toBe('write');
  });

  it('should infer DELETE method as delete risk level', () => {
    const result = parser.parse(JSON.stringify(validSpec));
    const deleteTool = result.tools.find(t => t.apiMapping.method === 'DELETE')!;
    expect(deleteTool.riskLevel).toBe('delete');
  });

  it('should reject invalid JSON', () => {
    expect(() => parser.parse('{ invalid json')).toThrow(BadRequestException);
  });

  it('should reject missing openapi field', () => {
    expect(() => parser.parse(JSON.stringify({ paths: {} }))).toThrow(BadRequestException);
  });

  it('should reject missing paths field', () => {
    expect(() => parser.parse(JSON.stringify({ openapi: '3.0.0' }))).toThrow(BadRequestException);
  });

  it('should handle operations without operationId', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1.0' },
      paths: { '/items': { get: { summary: 'List', responses: { '200': { description: 'OK' } } } } },
    };
    const result = parser.parse(JSON.stringify(spec));
    expect(result.tools[0].name).toBe('get__items');
  });

  it('should handle operations without summary', () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1.0' },
      paths: { '/items': { get: { operationId: 'listItems', responses: { '200': { description: 'OK' } } } } },
    };
    const result = parser.parse(JSON.stringify(spec));
    expect(result.tools[0].description).toBe('GET /items');
  });

  it('should handle empty paths object', () => {
    const spec = { openapi: '3.0.0', info: { title: 'T', version: '1.0' }, paths: {} };
    const result = parser.parse(JSON.stringify(spec));
    expect(result.tools).toHaveLength(0);
  });

  it('should preserve path parameters in apiMapping', () => {
    const result = parser.parse(JSON.stringify(validSpec));
    const deleteTool = result.tools.find(t => t.apiMapping.method === 'DELETE')!;
    expect(deleteTool.apiMapping.path).toBe('/pets/{id}');
  });

  it('should extract parameters from operation', () => {
    const result = parser.parse(JSON.stringify(validSpec));
    const deleteTool = result.tools.find(t => t.apiMapping.method === 'DELETE')!;
    expect(deleteTool.parameters).toBeDefined();
  });
});
