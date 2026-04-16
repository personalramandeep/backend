import {
  DEFAULT_ROLE,
  ERole,
  RoleEntity,
  SELF_ASSIGNABLE_ROLES,
  SYSTEM_ROLES,
  UserEntity,
} from '@app/common';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { IResolvedAuthContext } from '../../auth/auth.types';
import { UserRepository } from '../../user/repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import { RoleProfileService } from './role-profile.service';

@Injectable()
export class AuthorizationService implements OnModuleInit {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly userRepository: UserRepository,
    private readonly roleProfileService: RoleProfileService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSystemRoles();
  }

  async ensureSystemRoles(): Promise<void> {
    const existingRoles = await this.roleRepository.findAll();
    const existingNames = new Set(existingRoles.map((role) => role.name));

    for (const roleName of SYSTEM_ROLES) {
      if (!existingNames.has(roleName)) {
        await this.roleRepository.save(this.roleRepository.create({ name: roleName }));
      }
    }
  }

  getSelfAssignableRoles(): readonly ERole[] {
    return SELF_ASSIGNABLE_ROLES;
  }

  async ensureDefaultRole(user: UserEntity): Promise<UserEntity> {
    const hydratedUser = user.roles ? user : await this.userRepository.findByIdWithRoles(user.id);
    if (!hydratedUser) throw new NotFoundException('User not found');

    if (hydratedUser.roles?.length) {
      return hydratedUser;
    }

    const defaultRole = await this.roleRepository.findByName(DEFAULT_ROLE);
    if (!defaultRole) throw new NotFoundException(`Role ${DEFAULT_ROLE} not found`);

    return this.addRoleToHydratedUser(hydratedUser, defaultRole, {
      ensureProfile: true,
    });
  }

  getRoleNames(user: UserEntity): ERole[] {
    return [
      ...new Set((user.roles || []).map((membership) => membership.role?.name).filter(Boolean)),
    ];
  }

  async prepareAuthContext(user: UserEntity): Promise<IResolvedAuthContext> {
    const hydratedUser = await this.ensureDefaultRole(user);

    return {
      user: hydratedUser,
      auth: { userId: hydratedUser.id },
    };
  }

  async assignSelfServiceRole(userId: string, role: ERole): Promise<IResolvedAuthContext> {
    if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
      throw new ForbiddenException(`Role ${role} cannot be self-assigned`);
    }

    return this.assignRole(userId, role);
  }

  async assignAdminRole(targetUserId: string, role: ERole): Promise<IResolvedAuthContext> {
    if (role !== ERole.ADMIN) {
      throw new BadRequestException('Admin role management endpoint only supports admin');
    }

    return this.assignRole(targetUserId, role);
  }

  async revokeSelfServiceRole(userId: string, role: ERole): Promise<IResolvedAuthContext> {
    if (!SELF_ASSIGNABLE_ROLES.includes(role)) {
      throw new ForbiddenException(`Role ${role} cannot be self-revoked`);
    }

    return this.revokeRole(userId, role);
  }

  async revokeAdminRole(targetUserId: string, role: ERole): Promise<IResolvedAuthContext> {
    if (role !== ERole.ADMIN) {
      throw new BadRequestException('Admin role management endpoint only supports admin');
    }

    return this.revokeRole(targetUserId, role);
  }

  private async assignRole(userId: string, role: ERole): Promise<IResolvedAuthContext> {
    const user = await this.userRepository.findByIdWithRoles(userId);
    if (!user) throw new NotFoundException('User not found');

    const roleEntity = await this.roleRepository.findByName(role);
    if (!roleEntity) throw new NotFoundException(`Role ${role} not found`);

    const updatedUser = await this.addRoleToHydratedUser(user, roleEntity, {
      ensureProfile: true,
    });

    return {
      user: updatedUser,
      auth: { userId: updatedUser.id },
    };
  }

  private async revokeRole(userId: string, role: ERole): Promise<IResolvedAuthContext> {
    const user = await this.userRepository.findByIdWithRoles(userId);
    if (!user) throw new NotFoundException('User not found');

    const roleEntity = await this.roleRepository.findByName(role);
    if (!roleEntity) throw new NotFoundException(`Role ${role} not found`);

    const membershipIndex = user.roles?.findIndex(
      (entry) => entry.role_id === roleEntity.id || entry.role?.name === role,
    );

    if (membershipIndex === undefined || membershipIndex === -1) {
      return { user, auth: { userId: user.id } };
    }

    if ((user.roles?.length || 0) <= 1) {
      throw new BadRequestException('Cannot revoke the last assigned role');
    }

    await this.userRoleRepository.deleteByUserAndRole(user.id, roleEntity.id);
    user.roles?.splice(membershipIndex, 1);

    return {
      user,
      auth: { userId: user.id },
    };
  }

  private async addRoleToHydratedUser(
    user: UserEntity,
    roleEntity: RoleEntity,
    options: { ensureProfile: boolean },
  ): Promise<UserEntity> {
    const existing = user.roles?.find(
      (entry) => entry.role_id === roleEntity.id || entry.role?.name === roleEntity.name,
    );

    if (!existing) {
      const savedMembership = await this.userRoleRepository.save(
        this.userRoleRepository.create({
          user_id: user.id,
          role_id: roleEntity.id,
        }),
      );

      user.roles = [
        ...(user.roles || []),
        {
          ...savedMembership,
          user_id: user.id,
          role_id: roleEntity.id,
          role: roleEntity,
        },
      ];
    }

    if (options.ensureProfile) {
      await this.roleProfileService.ensureProfileForRole(user.id, roleEntity.name);
    }


    return user;
  }
}
