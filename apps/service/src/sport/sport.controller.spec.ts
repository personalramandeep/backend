/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../authorization/decorators/roles.decorator';
import { RolesGuard } from '../authorization/guards/roles.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { SportController } from './sport.controller';

describe('SportController metadata', () => {
  it('marks player self-service endpoints as player-only and guarded', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, SportController.prototype.getMySports);
    const guards = Reflect.getMetadata(GUARDS_METADATA, SportController.prototype.getMySports);

    expect(roles).toEqual(['player']);
    expect(guards).toEqual([AuthGuard, RolesGuard]);
  });

  it('marks admin catalog endpoints as admin-only and guarded', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, SportController.prototype.createSport);
    const guards = Reflect.getMetadata(GUARDS_METADATA, SportController.prototype.createSport);

    expect(roles).toEqual(['admin']);
    expect(guards).toEqual([AuthGuard, RolesGuard]);
  });

  it('keeps public catalog reads unguarded', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, SportController.prototype.listSports)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, SportController.prototype.getSport)).toBeUndefined();
  });
});
