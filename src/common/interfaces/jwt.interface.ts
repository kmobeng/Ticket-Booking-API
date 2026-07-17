export interface RefreshJWTPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

export interface AccessJWTPayload {
  sub: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  needToChangePassword: boolean;
  jti?: string;
  iat?: number;
  exp?: number;
}
