import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Check if they are either 'isAdmin: true' OR their role contains 'admin'
        const isRoleAdmin = user?.role?.toLowerCase().includes('admin');

        if (!user || (user.isAdmin !== true && !isRoleAdmin)) {
            throw new ForbiddenException('Only Fish Admins can access this resource.');
        }

        return true;
    }
}
