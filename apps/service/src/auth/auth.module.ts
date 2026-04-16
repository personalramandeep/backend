import { AuthProviderEntity, UserSessionEntity } from '@app/common';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { RedisModule } from '../redis/redis.module';
import { ReferralModule } from '../referral/referral.module';
import { StorageModule } from '../storage/storage.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { InternalHmacGuard } from './guards/internal-hmac.guard';
import { GoogleAuthProvider } from './providers/google-auth.provider';
import { PhoneOtpProvider } from './providers/phone-otp.provider';
import { AuthProviderRepository } from './repositories/auth-provider.repository';
import { SessionRepository } from './repositories/session.repository';
import { AuthCacheService } from './services/auth-cache.service';
import { AuthService } from './services/auth.service';
import { CookieService } from './services/cookie.service';
import { CryptoService } from './services/crypto.service';
import { JtiBlocklistService } from './services/jti-blocklist.service';
import { JWTService } from './services/jwt.service';
import { OtpService } from './services/otp.service';
import { SessionMetaService } from './services/session-meta.service';
import { SessionService } from './services/session.service';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    TypeOrmModule.forFeature([AuthProviderEntity, UserSessionEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const { publicKey, privateKey, accessTokenTtl } = configService.jwtConfig;
        return {
          publicKey,
          privateKey,
          signOptions: {
            algorithm: 'RS256',
            expiresIn: accessTokenTtl,
          },
        };
      },
      inject: [ConfigService],
    }),
    AuthorizationModule,
    UserModule,
    StorageModule,
    ReferralModule,
  ],
  controllers: [AuthController],
  providers: [
    // Core orchestration
    AuthService,
    // Auth Provider Strategies
    GoogleAuthProvider,
    PhoneOtpProvider,
    // Infrastructure
    OtpService,
    JtiBlocklistService,
    AuthProviderRepository,
    SessionRepository,
    SessionService,
    CryptoService,
    JWTService,
    CookieService,
    SessionMetaService,
    AuthCacheService,
    InternalHmacGuard,
  ],
  exports: [AuthService, SessionService, InternalHmacGuard],
})
export class AuthModule {}
