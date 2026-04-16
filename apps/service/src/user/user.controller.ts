import { ERole } from '@app/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IAuthenticatedUser } from '../auth/auth.types';
import { User, UserId } from '../auth/decorators/user.decorator';
import { Roles } from '../authorization/decorators/roles.decorator';
import { AuthorizationService } from '../authorization/services/authorization.service';
import { StorageService } from '../storage/storage.service';
import { GetUsersQueryDto } from './dtos/get-users-query.dto';
import { UpdateMyRoleDto } from './dtos/update-my-role.dto';
import { UpdatePlayerProfileDto } from './dtos/update-player-profile.dto';
import { UpdateProfilePicDto } from './dtos/update-profile-pic.dto';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import { UserService } from './services/user.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('/users')
@Roles(ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN)
export class UserController {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly userService: UserService,
    private readonly storageService: StorageService,
  ) {}

  @Get('/me')
  @ApiOperation({ summary: 'Get the current user and active authorization context' })
  getMe(@User() authUser: IAuthenticatedUser) {
    return {
      ...authUser,
      profile_pic_url: this.storageService.buildOptionalPublicUrl(authUser.profile_pic_url),
      roles: authUser.roleNames,
    };
  }

  @Get('/check-username')
  @ApiOperation({ summary: 'Check if a username is available' })
  async checkUsername(@Query('username') username: string) {
    const isAvailable = await this.userService.checkUsernameAvailability(username);
    return { available: isAvailable };
  }

  @Patch('/me')
  @ApiOperation({ summary: 'Update your profile information' })
  async updateMyProfile(@UserId() userId: string, @Body() body: UpdateUserProfileDto) {
    const updatedUser = await this.userService.updateProfile(userId, body);

    return {
      success: true,
      user: {
        ...updatedUser,
        profile_pic_url: this.storageService.buildOptionalPublicUrl(updatedUser.profile_pic_url),
      },
    };
  }

  @Patch('/me/player-profile')
  @ApiOperation({ summary: 'Update your player profile physical stats' })
  async updateMyPlayerProfile(@UserId() userId: string, @Body() body: UpdatePlayerProfileDto) {
    const updatedProfile = await this.userService.updatePlayerProfile(userId, body);
    return {
      success: true,
      player_profile: updatedProfile,
    };
  }

  @Post('/me/profile-pic')
  @ApiOperation({ summary: 'Update profile picture' })
  async updateMyProfilePic(@UserId() userId: string, @Body() body: UpdateProfilePicDto) {
    const profilePic = await this.userService.updateProfilePic(userId, body.mediaId);

    return {
      success: true,
      profile_pic_url: profilePic,
    };
  }

  @Post('/me/roles')
  @ApiOperation({ summary: 'Self-assign a role' })
  async assignMyRole(@UserId() userId: string, @Body() body: UpdateMyRoleDto) {
    const { auth } = await this.authorizationService.assignSelfServiceRole(userId, body.role);
    return auth;
  }

  @Delete('/me/roles/:role')
  @ApiOperation({ summary: 'Self-revoke a role' })
  async revokeMyRole(@UserId() userId: string, @Param('role') role: ERole) {
    const { auth } = await this.authorizationService.revokeSelfServiceRole(userId, role);
    return auth;
  }

  @Get('/')
  @ApiTags('Admin')
  @Roles(ERole.ADMIN)
  @ApiOperation({ summary: 'List all users with filtering, sort and pagination (ADMIN)' })
  async listUsers(@Query() query: GetUsersQueryDto) {
    const result = await this.userService.listUsers(query);
    return {
      ...result,
      data: result.data.map((u) => ({
        ...u,
        profile_pic_url: this.storageService.buildOptionalPublicUrl(u.profile_pic_url),
      })),
    };
  }

  @Patch('/:userId/status')
  @ApiTags('Admin')
  @Roles(ERole.ADMIN)
  @ApiOperation({ summary: 'Update user account status (ADMIN)' })
  async updateUserStatus(@Param('userId') userId: string, @Body() body: UpdateUserStatusDto) {
    const user = await this.userService.updateUserStatus(userId, body.status);
    return { success: true, account_status: user.account_status };
  }

  @Post('/:userId/roles')
  @ApiTags('Admin')
  @Roles(ERole.ADMIN)
  @ApiOperation({ summary: 'Grant admin role to a user (ADMIN)' })
  async assignAdminRole(@Param('userId') targetUserId: string, @Body() body: UpdateMyRoleDto) {
    const { auth } = await this.authorizationService.assignAdminRole(targetUserId, body.role);
    return auth;
  }

  @Delete('/:userId/roles/:role')
  @ApiTags('Admin')
  @Roles(ERole.ADMIN)
  @ApiOperation({ summary: 'Revoke admin role from a user (ADMIN)' })
  async revokeAdminRole(@Param('userId') targetUserId: string, @Param('role') role: ERole) {
    const { auth } = await this.authorizationService.revokeAdminRole(targetUserId, role);
    return auth;
  }
}
