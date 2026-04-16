import { ERole } from '@app/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../auth/guards/auth.guard';
import { MediaController } from '../media/media.controller';
import { PostController } from '../post/post.controller';
import { UserController } from '../user/user.controller';
import { ROLES_KEY } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

describe('Role-based controller metadata', () => {
  const reflector = new Reflector();
  const allRoles = [ERole.PLAYER, ERole.PARENT, ERole.COACH, ERole.ADMIN];

  const getRoles = (controller: Function, handlerName: string) =>
    reflector.getAllAndOverride<ERole[]>(ROLES_KEY, [controller.prototype[handlerName], controller]);

  const getGuards = (controller: Function) => Reflect.getMetadata(GUARDS_METADATA, controller) as Function[];

  it('wires UserController to AuthGuard and RolesGuard', () => {
    expect(getGuards(UserController)).toEqual([AuthGuard, RolesGuard]);
  });

  it('allows all current roles on the general UserController endpoints', () => {
    expect(getRoles(UserController, 'getMe')).toEqual(allRoles);
    expect(getRoles(UserController, 'assignMyRole')).toEqual(allRoles);
    expect(getRoles(UserController, 'revokeMyRole')).toEqual(allRoles);
    expect(getRoles(UserController, 'switchMyActiveRole')).toEqual(allRoles);
  });

  it('keeps the deprecated admin user-role endpoints admin-only', () => {
    expect(getRoles(UserController, 'assignAdminRole')).toEqual([ERole.ADMIN]);
    expect(getRoles(UserController, 'revokeAdminRole')).toEqual([ERole.ADMIN]);
  });

  it('wires PostController to all current roles via RolesGuard', () => {
    expect(getGuards(PostController)).toEqual([AuthGuard, RolesGuard]);
    expect(getRoles(PostController, 'create')).toEqual(allRoles);
  });

  it('wires MediaController to all current roles via RolesGuard', () => {
    expect(getGuards(MediaController)).toEqual([AuthGuard, RolesGuard]);
    expect(getRoles(MediaController, 'initiateUpload')).toEqual(allRoles);
    expect(getRoles(MediaController, 'completeUpload')).toEqual(allRoles);
  });
});
