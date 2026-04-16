export enum ERole {
  PLAYER = 'player',
  PARENT = 'parent',
  COACH = 'coach',
  ADMIN = 'admin',
}

export const SYSTEM_ROLES: readonly ERole[] = [
  ERole.PLAYER,
  ERole.PARENT,
  ERole.COACH,
  ERole.ADMIN,
];

export const SELF_ASSIGNABLE_ROLES: readonly ERole[] = [ERole.PLAYER, ERole.PARENT, ERole.COACH];

export const DEFAULT_ROLE = ERole.PLAYER;
