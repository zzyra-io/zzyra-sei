import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserRepository } from "@zyra/database";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository
  ) {}

  async validateUser(payload: any) {
    const user = await this.userRepository.findById(payload.sub);
    if (user) {
      return {
        id: user.id,
        email: user.email,
        name: user.email ? user.email.split("@")[0] : "User",
      };
    }
    return null;
  }

  async generateToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    return this.jwtService.sign(payload);
  }
}
