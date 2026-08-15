import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyOtpDto, RefreshDto, ChangeMpinDto } from './dto/auth.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Inscription : User + Wallet + KycRecord (ADR-003) + OTP' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login : JWT + verrouillage 3 essais (30 min)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('verify-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Vérification OTP SMS 6 chiffres (TTL 5 min)' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotation du refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('change-mpin')
  @HttpCode(200)
    @ApiBearerAuth()
  @ApiOperation({ summary: 'Changement de MPIN (6 chiffres)' })
  changeMpin(@CurrentUser() user: { sub: string }, @Body() dto: ChangeMpinDto) {
    return this.auth.changeMpin(user.sub, dto);
  }
}
