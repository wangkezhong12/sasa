import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SaaSBindingService } from './saas-binding.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { BindSaasDto } from './dto/bind-saas.dto';

@Controller('saas-bindings')
@UseGuards(JwtAuthGuard)
export class SaaSBindingController {
  constructor(private bindingService: SaaSBindingService) {}

  @Post()
  bind(@Request() req: any, @Body() dto: BindSaasDto) {
    return this.bindingService.bind(req.user.id, {
      connectorId: dto.connectorId,
      authType: dto.authType,
      credential: dto.toCredentialInput(),
      saasUserId: dto.saasUserId,
      saasUsername: dto.saasUsername,
    });
  }

  @Get()
  list(@Request() req: any) {
    return this.bindingService.getBindings(req.user.id);
  }

  @Delete(':id')
  unbind(@Request() req: any, @Param('id') id: string) {
    return this.bindingService.unbind(req.user.id, id);
  }
}
