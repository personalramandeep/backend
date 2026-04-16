import { CoachProfileEntity, ERole, ParentProfileEntity, PlayerProfileEntity } from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RoleProfileService {
  constructor(
    @InjectRepository(PlayerProfileEntity)
    private readonly playerProfileRepository: Repository<PlayerProfileEntity>,
    @InjectRepository(ParentProfileEntity)
    private readonly parentProfileRepository: Repository<ParentProfileEntity>,
    @InjectRepository(CoachProfileEntity)
    private readonly coachProfileRepository: Repository<CoachProfileEntity>,
  ) {}

  async ensureProfileForRole(userId: string, role: ERole): Promise<void> {
    if (role === ERole.PLAYER) {
      const exists = await this.playerProfileRepository.exists({ where: { user_id: userId } });
      if (!exists) {
        await this.playerProfileRepository.save(this.playerProfileRepository.create({ user_id: userId }));
      }
      return;
    }

    if (role === ERole.PARENT) {
      const exists = await this.parentProfileRepository.exists({ where: { user_id: userId } });
      if (!exists) {
        await this.parentProfileRepository.save(this.parentProfileRepository.create({ user_id: userId }));
      }
      return;
    }

    if (role === ERole.COACH) {
      const exists = await this.coachProfileRepository.exists({ where: { user_id: userId } });
      if (!exists) {
        await this.coachProfileRepository.save(this.coachProfileRepository.create({ user_id: userId }));
      }
    }
  }
}
