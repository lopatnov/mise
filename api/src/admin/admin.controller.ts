import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type JwtUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { CreateInviteDto, SetupDto, UpdateSettingsDto, UpdateUserDto } from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Setup — no auth required, only works when no admin exists
  @Public()
  @Get('setup')
  @ApiOperation({ summary: 'Check whether initial admin setup has been completed' })
  @ApiResponse({ status: 200, description: '{ setupDone: boolean }' })
  async setupStatus() {
    const done = await this.adminService.isSetupDone();
    return { setupDone: done };
  }

  @Public()
  @Post('setup')
  @ApiOperation({ summary: 'Create the first admin account (only works when no admin exists)' })
  @ApiResponse({ status: 201, description: 'Returns JWT token for the new admin' })
  @ApiResponse({ status: 409, description: 'Admin already exists' })
  setup(@Body() dto: SetupDto) {
    return this.adminService.setup(dto.email, dto.password, dto.displayName);
  }

  @Public()
  @Get('settings/public')
  @ApiOperation({ summary: 'Get public app settings (siteTitle)' })
  @ApiResponse({ status: 200, description: 'Public settings object' })
  getPublicSettings() {
    return this.adminService.getPublicSettings();
  }

  // All routes below require admin role
  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Get('settings')
  @ApiOperation({ summary: 'Get full app settings including SMTP config (admin only)' })
  @ApiResponse({ status: 200, description: 'Full settings document' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Patch('settings')
  @ApiOperation({ summary: 'Update app settings (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated settings document' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Post('invites')
  @ApiOperation({ summary: 'Generate an invite link (admin only)' })
  @ApiResponse({ status: 201, description: 'Invite document with token URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  createInvite(@Body() dto: CreateInviteDto, @CurrentUser() user: JwtUser) {
    return this.adminService.createInvite(dto, user.userId);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Get('invites')
  @ApiOperation({ summary: 'List all active (unused, unexpired) invites (admin only)' })
  @ApiResponse({ status: 200, description: 'Array of invite documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  listInvites() {
    return this.adminService.listInvites();
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Delete('invites/:id')
  @ApiOperation({ summary: 'Revoke an invite by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Invite deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  deleteInvite(@Param('id') id: string) {
    return this.adminService.deleteInvite(id);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Get('users')
  @ApiOperation({ summary: 'List all registered users (admin only)' })
  @ApiResponse({ status: 200, description: 'Array of user documents' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role or active status (admin only)' })
  @ApiResponse({ status: 200, description: 'Updated user document' })
  @ApiResponse({ status: 400, description: 'Cannot demote the last admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AdminGuard)
  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user account (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete the last admin' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
