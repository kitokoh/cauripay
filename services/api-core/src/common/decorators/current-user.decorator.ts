import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Payload JWT validé attaché à la requête par JwtAuthGuard. */
export interface AuthUser {
  sub: string;
  roles: string[];
  [key: string]: unknown;
}

/** Récupère l'utilisateur authentifié (payload JWT) : @CurrentUser() user: AuthUser. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user as AuthUser;
  },
);
