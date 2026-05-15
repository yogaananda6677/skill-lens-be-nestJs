import type { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

export const DEFAULT_JWT_EXPIRES_IN = '1d';
export const LOCAL_DEVELOPMENT_JWT_SECRET = 'skilllens-local-development-secret-change-before-production';

export type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;

export function getJwtSecret(configService: ConfigService): string {
  const secret =
    configService.get<string>('KODE_JWT') ||
    configService.get<string>('JWT_SECRET') ||
    LOCAL_DEVELOPMENT_JWT_SECRET;

  return secret.trim();
}

export function getJwtExpiresIn(configService: ConfigService): JwtExpiresIn {
  const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || DEFAULT_JWT_EXPIRES_IN;

  // @nestjs/jwt follows jsonwebtoken's SignOptions type. In newer versions,
  // expiresIn is typed as number | ms.StringValue, not plain string.
  // Env values such as "1d", "12h", and "30m" are valid at runtime, so we
  // narrow the string to the library's accepted expiresIn type here.
  return expiresIn.trim() as JwtExpiresIn;
}
