import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            // This will look for the token in the headers sent from your Mobile App
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    // The 'payload' precisely matches what you packed in auth.service.ts -> this.jwtService.sign(...)
    async validate(payload: any) {
        // Add role to the return object
        return { userId: payload.id, isAdmin: payload.isAdmin, role: payload.role };
    }

}
