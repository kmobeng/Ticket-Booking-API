import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { IsEmailVerifiedGuard } from '../common/guards/is-email-verified.guard';
import { NeedToChangePasswordGuard } from '../common/guards/need-to-change-password.guard';
import { Roles } from '../common/decorators/role.decorator';
import { Role } from '../../generated/prisma/client';
import { RoleGuard } from '../common/guards/role.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Get('users')
  async getAllUsers() {
    const users = await this.adminService.getAllUsers();
    return {
      success: true,
      result: users.length,
      data: users,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    const user = await this.adminService.getUserById(id);
    return {
      success: true,
      data: user,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Get('organizers')
  async getAllOrganizers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('verified') verified: string = '',
  ) {
    const organizers = await this.adminService.getAllOrganizers(
      search,
      page,
      limit,
      verified,
    );

    return {
      success: true,
      data: organizers,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Patch('organizers/:id/verify')
  async verifyOrganizer(@Param('id') organizerId: string) {
    const organizer = await this.adminService.verifyOrganizer(organizerId);
    return {
      success: true,
      message: 'Organizer verified successfully',
      data: organizer,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Patch('organizers/:id/unverify')
  async unverifyOrganizer(@Param('id') organizerId: string) {
    const organizer = await this.adminService.unverifyOrganizer(organizerId);
    return {
      success: true,
      message: 'Organizer unverified successfully',
      data: organizer,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Get('events')
  async listAllEvents() {
    const events = await this.adminService.listAllEvents();
    return {
      success: true,
      data: events,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Get('events/:id')
  async listAllEventsByOrganizer(@Param('id') organizerId: string) {
    const events =
      await this.adminService.listAllEventsByOrganizer(organizerId);
    return {
      success: true,
      data: events,
    };
  }

  @UseGuards(
    JwtAuthGuard,
    RoleGuard,
    IsEmailVerifiedGuard,
    NeedToChangePasswordGuard,
  )
  @Roles(Role.ADMIN)
  @Get('orders')
  async listAllOrders() {
    const orders = await this.adminService.listAllOrders();
    return {
      success: true,
      data: orders,
    };
  }
}
