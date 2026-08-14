import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevController } from './dev.controller';
import { ApiKeysService } from './api-keys/api-keys.service';
import { ApiKeyGuard } from './api-keys/api-key.guard';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { DevWebhooksService } from './webhooks/dev-webhooks.service';
import { SandboxService } from './sandbox/sandbox.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [DevController],
  providers: [ApiKeysService, ApiKeyGuard, RateLimitService, DevWebhooksService, SandboxService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware).forRoutes('*');
  }
}
