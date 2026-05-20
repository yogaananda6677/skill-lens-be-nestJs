import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly roles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Token tidak valid atau role tidak ditemukan.');
    }

    if (!this.roles.includes(user.role)) {
      throw new ForbiddenException('Role tidak memiliki akses ke endpoint ini.');
    }

    return true;
  }
}
