import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "@zzyra/database";

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
}

interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository
  ) {}

  async validateUser(payload: JwtPayload): Promise<AuthUser | null> {
    const user = await this.userRepository.findById(payload.sub);
    if (user) {
      return {
        id: user.id,
        email: user.email || "",
        name: user.email ? user.email.split("@")[0] : "User",
      };
    }
    return null;
  }

  async generateToken(user: AuthUser): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 3600, // 1 hour
    };
  }
}
