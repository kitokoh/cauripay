import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/roles.decorator';
import { RedisProvider, REDIS } from '../common/redis.module';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class RegisterDto {
  phone!: string;
  password!: string;
  fullName?: string;
  email?: string;
}

class LoginDto {
  phone!: string;
  password!: string;
}

class VerifyOtpDto {
  phone!: string;
  otp!: string;
}

class RefreshDto {
  refreshToken!: string;
}

class ChangeMpinDto {
  oldMpin!: string;
  newMpin!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(REDIS) private readonly redis: RedisProvider,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Inscription (User + Wallet + KycRecord atomiques)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Connexion (verrouillage 3 essais / 30 min)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('request-otp')
  @ApiOperation({ summary: 'Demande d’OTP (dev : renvoie le code)' })
  requestOtp(@Body() dto: { phone: string }) {
    return this.auth.requestOtp(dto.phone);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Vérification OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post('change-mpin')
  @ApiOperation({ summary: 'Changement de PIN' })
  changeMpin(@Body() dto: ChangeMpinDto, @CurrentUser() user: { sub: string }) {
    return this.auth.changeMpin(user.sub, dto);
  }
}
