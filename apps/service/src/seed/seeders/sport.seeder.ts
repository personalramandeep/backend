import { SportEntity, SportPostOptions } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

interface SportDef {
  name: string;
  slug: string;
  postOptions?: SportPostOptions;
}

@Injectable()
export class SportSeeder {
  private readonly logger = new Logger(SportSeeder.name);

  private readonly sports: SportDef[] = [
    {
      name: 'Badminton',
      slug: 'badminton',
      postOptions: {
        gameTypes: [
          { value: 'singles', label: 'Singles', enabled: true },
          { value: 'doubles', label: 'Doubles', enabled: false }, // analysis not yet supported
        ],
        cameraViews: [
          { value: 'baseline', label: 'Baseline', enabled: true },
          { value: 'front_net', label: 'Front (Net)', enabled: true },
        ],
      },
    },
    {
      name: 'Tennis',
      slug: 'tennis',
      postOptions: {
        gameTypes: [
          { value: 'singles', label: 'Singles', enabled: true },
          { value: 'doubles', label: 'Doubles', enabled: false },
          { value: 'mixed_doubles', label: 'Mixed Doubles', enabled: false },
        ],
        cameraViews: [
          { value: 'baseline', label: 'Baseline', enabled: true },
          { value: 'side', label: 'Side', enabled: true },
        ],
      },
    },
    // { name: 'Cricket', slug: 'cricket' },
    // { name: 'Football', slug: 'football' },
    // { name: 'Basketball', slug: 'basketball' },
    // { name: 'Table Tennis', slug: 'table-tennis' },
    // { name: 'Hockey', slug: 'hockey' },
    // { name: 'Volleyball', slug: 'volleyball' },
  ];

  constructor(@InjectRepository(SportEntity) private readonly sportRepo: Repository<SportEntity>) {}

  async run(): Promise<void> {
    let created = 0;
    for (const def of this.sports) {
      const existing = await this.sportRepo.findOne({ where: { slug: def.slug } });
      if (existing) {
        if (def.postOptions) {
          await this.sportRepo.update(existing.id, { post_options: def.postOptions });
          this.logger.verbose(`Sport '${def.slug}' postOptions updated`);
        }
      } else {
        await this.sportRepo.save(
          this.sportRepo.create({
            name: def.name,
            slug: def.slug,
            is_active: true,
            post_options: def.postOptions,
          }),
        );
        created++;
        this.logger.verbose(`Sport '${def.slug}' created`);
      }
    }
    this.logger.log(`Sports: ${created} created, ${this.sports.length - created} already existed`);
  }
}
