import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'change-this-secret-key',
    });
  }

  async validate(payload: any) {
    // Payload đã được verify bởi passport-jwt, chỉ cần validate token trong DB
    // Sử dụng payload.sub (user ID) để validate
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException();
    }
    
    // Có thể validate token trong DB nếu cần, nhưng payload đã được verify
    return { userId: payload.sub, email: payload.email };
  }
}

