import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const headerAuth: string | undefined = req.headers?.authorization;
    const bearerToken =
      typeof headerAuth === 'string' && headerAuth.toLowerCase().startsWith('bearer ')
        ? headerAuth.slice(7).trim()
        : null;

    const cookieToken: string | undefined = req.cookies?.access_token;
    const token = bearerToken || cookieToken;

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const decoded = this.jwtService.verify(token);
      req.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
