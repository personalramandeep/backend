import {
  CoachProfileEntity,
  ParentProfileEntity,
  PlayerProfileEntity,
  RoleEntity,
  UserEntity,
  UserRoleEntity,
} from '@app/common';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { RolesGuard } from './guards/roles.guard';
import { RoleRepository } from './repositories/role.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { AuthorizationService } from './services/authorization.service';
import { RoleProfileService } from './services/role-profile.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      UserRoleEntity,
      UserEntity,
      PlayerProfileEntity,
      ParentProfileEntity,
      CoachProfileEntity,
    ]),
    UserModule,
  ],
  providers: [
    AuthorizationService,
    RoleProfileService,
    RoleRepository,
    UserRoleRepository,
    RolesGuard,
  ],
  exports: [AuthorizationService, RolesGuard],
})
export class AuthorizationModule {}
