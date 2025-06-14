import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract JWT from Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Extract JWT from cookies for compatibility with Next.js auth
        (request: Request) => {
          // First try the session token (our main JWT)
          const sessionToken =
            request?.cookies?.["next-auth.session-token"] ||
            request?.cookies?.["__Secure-next-auth.session-token"];
          if (sessionToken) {
            return sessionToken;
          }

          // Fallback to the access token for backward compatibility
          return request?.cookies?.token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
    });
  }

  async validate(payload: JwtPayload) {
    // Return user object that will be attached to request.user
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresAt: payload.expiresAt,
    };
  }
}
