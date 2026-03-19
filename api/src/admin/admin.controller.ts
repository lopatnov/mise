import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { SetupDto, UpdateSettingsDto, CreateInviteDto, UpdateUserDto } from './dto/admin.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, type JwtUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Setup — no auth required, only works when no admin exists
  @Public()
  @Get('setup')
  async setupStatus() {
    const done = await this.adminService.isSetupDone();
    return { setupDone: done };
  }

  @Public()
  @Post('setup')
  setup(@Body() dto: SetupDto) {
    return this.adminService.setup(dto.email, dto.password, dto.displayName);
  }

  // All routes below require admin role
  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Post('invites')
  createInvite(@Body() dto: CreateInviteDto, @CurrentUser() user: JwtUser) {
    return this.adminService.createInvite(dto, user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Get('invites')
  listInvites() {
    return this.adminService.listInvites();
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Delete('invites/:id')
  deleteInvite(@Param('id') id: string) {
    return this.adminService.deleteInvite(id);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
