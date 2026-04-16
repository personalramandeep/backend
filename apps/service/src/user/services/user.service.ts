import { EMediaStatus, EUserAccountStatus, PlayerProfileEntity, UserEntity } from '@app/common';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaService } from '../../media/media.service';
import { GetUsersQueryDto } from '../dtos/get-users-query.dto';
import { UserRepository } from '../repositories/user.repository';
import { ICreateUserDTO } from '../user.types';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mediaService: MediaService,
    @InjectRepository(PlayerProfileEntity)
    private readonly playerProfileRepository: Repository<PlayerProfileEntity>,
  ) {}

  async create(data: ICreateUserDTO): Promise<UserEntity> {
    const normalizedUsername = data.username.toLowerCase();
    const normalizedEmail = data.email ? data.email.toLowerCase() : null;

    const existing = await this.userRepository.usernameExists(normalizedUsername);

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    if (normalizedEmail) {
      const existingByEmail = await this.userRepository.emailExists(normalizedEmail);

      if (existingByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const user = this.userRepository.create({
      ...data,
      username: normalizedUsername,
      email: normalizedEmail,
      account_status: EUserAccountStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // NOTE: New users start on the Free plan automatically — no DB record needed.
    // EntitlementService uses plan slug 'free' as fallback when no active subscription exists.

    return savedUser;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async findByIdWithRoles(id: string): Promise<UserEntity | null> {
    return this.userRepository.findByIdWithRoles(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByPhone(phone_number: string): Promise<UserEntity | null> {
    return this.userRepository.findByPhone(phone_number);
  }

  async updateProfilePic(userId: string, mediaId: string): Promise<string> {
    const media = await this.mediaService.lockSession({
      mediaId,
      userId,
      fromStatus: EMediaStatus.UPLOADED,
      toStatus: EMediaStatus.PROCESSING,
    });

    await this.userRepository.updateOne(userId, { profile_pic_url: media.objectKey });
    const profilePicUrl = this.mediaService.getPublicUrl(media);

    return profilePicUrl;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    if (!username) return false;
    const exists = await this.userRepository.usernameExists(username.toLowerCase());
    return !exists;
  }

  async updateProfile(userId: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: Partial<UserEntity> = { ...data };

    if (updates.username) {
      const normalizedUsername = updates.username.toLowerCase();
      if (normalizedUsername !== user.username.toLowerCase()) {
        const existing = await this.userRepository.usernameExists(normalizedUsername);
        if (existing) {
          throw new ConflictException('Username already exists');
        }
        updates.username = normalizedUsername;
      } else {
        delete updates.username;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.userRepository.updateOne(userId, updates);
    }

    const updatedUser = await this.userRepository.findById(userId);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async listUsers(query: GetUsersQueryDto) {
    return this.userRepository.paginate({
      page: query.page,
      limit: query.limit,
      search: query.search,
      role: query.role,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async updateUserStatus(userId: string, status: EUserAccountStatus): Promise<UserEntity> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.updateOne(userId, { account_status: status });
    return this.userRepository.findById(userId) as Promise<UserEntity>;
  }

  async updatePlayerProfile(userId: string, data: Partial<PlayerProfileEntity>) {
    let profile = await this.playerProfileRepository.findOne({ where: { user_id: userId } });

    if (!profile) {
      profile = this.playerProfileRepository.create({ user_id: userId, ...data });
      await this.playerProfileRepository.save(profile);
    } else {
      if (Object.keys(data).length > 0) {
        await this.playerProfileRepository.update({ user_id: userId }, data);
      }
    }

    return this.playerProfileRepository.findOne({ where: { user_id: userId } });
  }
}
