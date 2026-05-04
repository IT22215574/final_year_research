import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guards routes so admin-like users can access protected resources.
 * Must be used after AuthTokenGuard which attaches req.user.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const role = String(req.user?.role || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    const isAdminLike =
      req.user?.isAdmin === true ||
      String(req.user?.isAdmin).toLowerCase() === 'true' ||
      role.includes('admin');

    if (!isAdminLike) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
