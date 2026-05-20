import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from './jwt.config';

export interface JwtPayload {
  id?: number;
  sub?: number;
  role?: string;
  id_sekolah?: number | null;
  sekolahId?: number | null;
  must_change_password?: boolean;
  username?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      ...payload,
      id_user: payload.id ?? payload.sub,
      id_sekolah: payload.id_sekolah ?? payload.sekolahId ?? null,
    };
  }
}
