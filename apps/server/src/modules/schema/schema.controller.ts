import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SchemaService } from './schema.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { UploadSchemaDto } from './dto/upload-schema.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

@Controller('schemas')
@UseGuards(JwtAuthGuard)
export class SchemaController {
  constructor(private schemaService: SchemaService) {}

  @Post('upload')
  upload(@Body() dto: UploadSchemaDto) {
    return this.schemaService.uploadAndParse(dto.workspaceId ?? null, dto.name, dto.schema);
  }

  @Get('connectors')
  listConnectors(@Request() req: any) {
    return this.schemaService.listConnectors(req.user?.id ?? null);
  }

  @Post('connectors/:id/publish')
  publish(@Param('id') id: string) {
    return this.schemaService.publishConnector(id);
  }

  @Get('connectors/:id/tools')
  listTools(@Param('id') id: string) {
    return this.schemaService.listTools(id);
  }

  @Patch('tools/:id')
  updateTool(@Param('id') id: string, @Body() dto: UpdateToolDto) {
    return this.schemaService.updateTool(id, dto);
  }
}
