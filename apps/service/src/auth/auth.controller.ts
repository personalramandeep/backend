import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from './decorators/public.decorator';
import { RefreshToken } from './decorators/refresh-token.decorator';
import { GoogleLoginDto } from './dtos/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dtos/phone-otp.dto';
import { PhoneNormalizationPipe } from './pipes/phone-normalization.pipe';
import { GoogleAuthProvider } from './providers/google-auth.provider';
import { PhoneOtpProvider } from './providers/phone-otp.provider';
import { AuthService } from './services/auth.service';
import { CookieService } from './services/cookie.service';
import { SessionMetaService } from './services/session-meta.service';

@ApiTags('Auth')
@Public()
@Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly sessionMetaService: SessionMetaService,
    private readonly googleAuthProvider: GoogleAuthProvider,
    private readonly phoneOtpProvider: PhoneOtpProvider,
  ) {}

  @Post('/google')
  @ApiOperation({ summary: 'Login or signup with Google ID token' })
  async googleLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: GoogleLoginDto,
    @Headers('x-timezone') timezone?: string,
  ) {
    const { accessToken, refreshToken, auth } = await this.authService.loginWithProvider(
      this.googleAuthProvider,
      [body.idToken],
      this.sessionMetaService.build(req),
      { timezone, referralCode: body.referralCode },
    );
    this.cookieService.setRefreshToken(res, refreshToken);
    return res.json({ accessToken, auth });
  }

  @Post('/phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to a phone number (E.164 format)' })
  async sendOtp(@Body(PhoneNormalizationPipe) body: SendOtpDto) {
    return this.phoneOtpProvider.sendOtp(body.phone);
  }

  @Post('/phone/verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login/signup with phone number' })
  async verifyOtp(
    @Req() req: Request,
    @Res() res: Response,
    @Body(PhoneNormalizationPipe) body: VerifyOtpDto,
  ) {
    const { accessToken, refreshToken, auth } = await this.authService.loginWithProvider(
      this.phoneOtpProvider,
      [body.phone, body.otp],
      this.sessionMetaService.build(req),
      { referralCode: body.referralCode },
    );
    this.cookieService.setRefreshToken(res, refreshToken);
    return res.json({ accessToken, auth });
  }

  @Post('/refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Res() res: Response, @RefreshToken() refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      auth,
    } = await this.authService.refresh(refreshToken);

    this.cookieService.setRefreshToken(res, newRefreshToken);
    return res.json({ accessToken, auth });
  }

  @Post('/logout')
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@Req() req: Request, @Res() res: Response, @RefreshToken() refreshToken?: string) {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    await this.authService.logout(refreshToken, accessToken);
    this.cookieService.clearRefreshToken(res);
    return res.json({ success: true });
  }
}
