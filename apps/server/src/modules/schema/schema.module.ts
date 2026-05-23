import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller';
import { SchemaService } from './schema.service';
import { SchemaParserService } from './schema-parser.service';

@Module({
  controllers: [SchemaController],
  providers: [SchemaService, SchemaParserService],
  exports: [SchemaService],
})
export class SchemaModule {}
