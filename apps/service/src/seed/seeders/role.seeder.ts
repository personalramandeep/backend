import { RoleEntity, SYSTEM_ROLES } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class RoleSeeder {
  private readonly logger = new Logger(RoleSeeder.name);

  constructor(@InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>) {}

  async run(): Promise<void> {
    let created = 0;
    for (const roleName of SYSTEM_ROLES) {
      const existing = await this.roleRepo.findOne({ where: { name: roleName } });
      if (!existing) {
        await this.roleRepo.save(this.roleRepo.create({ name: roleName }));
        created++;
        this.logger.verbose(`Role '${roleName}' created`);
      }
    }
    this.logger.log(`Roles: ${created} created, ${SYSTEM_ROLES.length - created} already existed`);
  }
}
