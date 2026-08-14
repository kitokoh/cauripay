import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users/me')
  me(@CurrentUser('sub') userId: string) {
    return this.users.me(userId);
  }

  @Get('users/me/kyc')
  kyc(@CurrentUser('sub') userId: string) {
    return this.users.kycStatus(userId);
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'UP' };
  }
}
