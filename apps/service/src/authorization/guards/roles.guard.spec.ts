import { ERole } from '@app/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const buildContext = (handler: Function, controller: Function, user?: { activeRole: ERole }) =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('allows access when no roles metadata is present', () => {
    class TestController {
      handler() {}
    }

    const guard = new RolesGuard(new Reflector());

    expect(guard.canActivate(buildContext(TestController.prototype.handler, TestController))).toBe(true);
  });

  it('allows access when the active role is in the required roles', () => {
    class TestController {
      @Roles(ERole.COACH, ERole.ADMIN)
      handler() {}
    }

    const guard = new RolesGuard(new Reflector());

    expect(
      guard.canActivate(buildContext(TestController.prototype.handler, TestController, { activeRole: ERole.ADMIN })),
    ).toBe(true);
  });

  it('rejects when the authenticated user context is missing', () => {
    class TestController {
      @Roles(ERole.ADMIN)
      handler() {}
    }

    const guard = new RolesGuard(new Reflector());

    expect(() => guard.canActivate(buildContext(TestController.prototype.handler, TestController))).toThrow(
      new ForbiddenException('Missing authenticated user context'),
    );
  });

  it('rejects when the active role is not allowed', () => {
    class TestController {
      @Roles(ERole.ADMIN)
      handler() {}
    }

    const guard = new RolesGuard(new Reflector());

    expect(() =>
      guard.canActivate(buildContext(TestController.prototype.handler, TestController, { activeRole: ERole.PLAYER })),
    ).toThrow(new ForbiddenException('Role not allowed'));
  });

  it('prefers method-level roles over class-level roles', () => {
    @Roles(ERole.PLAYER)
    class TestController {
      @Roles(ERole.ADMIN)
      handler() {}
    }

    const guard = new RolesGuard(new Reflector());

    expect(
      guard.canActivate(buildContext(TestController.prototype.handler, TestController, { activeRole: ERole.ADMIN })),
    ).toBe(true);
    expect(() =>
      guard.canActivate(buildContext(TestController.prototype.handler, TestController, { activeRole: ERole.PLAYER })),
    ).toThrow(new ForbiddenException('Role not allowed'));
  });
});
