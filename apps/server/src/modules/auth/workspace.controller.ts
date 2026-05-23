import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(dto.name, req.user.id);
  }

  @Get()
  list(@Request() req: any) {
    return this.workspaceService.findByUser(req.user.id);
  }

  @Post(':id/members')
  addMember(@Param('id') workspaceId: string, @Body() dto: AddMemberDto) {
    return this.workspaceService.addMember(workspaceId, dto.userId, dto.role);
  }

  @Get(':id/members')
  listMembers(@Param('id') workspaceId: string) {
    return this.workspaceService.listMembers(workspaceId);
  }

  @Delete(':id/members/:memberId')
  removeMember(@Param('id') workspaceId: string, @Param('memberId') memberId: string) {
    return this.workspaceService.removeMember(workspaceId, memberId);
  }
}
