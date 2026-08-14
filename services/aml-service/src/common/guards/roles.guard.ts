import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

export const ROLES_KEY = 'aml:roles';

/** @Roles('COMPLIANCE_OFFICER', ...) — exigé sur les routes back-office. */
export function Roles(...roles: string[]): MethodDecorator & ClassDecorator {
  return (target: object, _key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    else Reflect.defineMetadata(ROLES_KEY, roles, target);
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    ) ?? this.reflector.get<string[]>(ROLES_KEY, context.getClass());
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request & { auth?: { kind: string; roles?: string[] } }>();
    const auth = req.auth;
    // Accès inter-services (X-Service-Key) : la confiance est déléguée au client interne.
    if (auth?.kind === 'service') return true;
    const hasRole = required.some((r) => auth?.roles?.includes(r));
    if (!hasRole) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: `Rôle requis : ${required.join(', ')}` });
    }
    return true;
  }
}
