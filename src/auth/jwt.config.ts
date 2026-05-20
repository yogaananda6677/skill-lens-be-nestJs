import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

export const DEFAULT_JWT_EXPIRES_IN = '1d';
export const LOCAL_DEVELOPMENT_JWT_SECRET =
  'skilllens-local-development-secret-change-before-production';

export type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;

export function getJwtSecret(configService: ConfigService): string {
  const secret =
    configService.get<string>('KODE_JWT') ||
    configService.get<string>('JWT_SECRET') ||
    '';

  if (secret.trim()) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new InternalServerErrorException(
      'JWT_SECRET/KODE_JWT wajib diisi pada production.',
    );
  }

  return LOCAL_DEVELOPMENT_JWT_SECRET;
}

export function getJwtExpiresIn(configService: ConfigService): JwtExpiresIn {
  const expiresIn =
    configService.get<string>('JWT_EXPIRES_IN') || DEFAULT_JWT_EXPIRES_IN;

  return expiresIn.trim() as JwtExpiresIn;
}
