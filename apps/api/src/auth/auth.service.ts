import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  AuthService as DatabaseAuthService,
  UserRepository,
} from "@zyra/database";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseAuthService: DatabaseAuthService,
    private readonly userRepository: UserRepository
  ) {}

  async login(email: string, password: string) {
    // This would implement actual login logic
    // For now, return a mock response
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error("User not found");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: false,
      teamIds: [],
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async register(email: string, password: string, fullName?: string) {
    // This would implement actual registration logic
    const user = await this.userRepository.create({
      email,
      fullName,
    });

    const payload = {
      sub: user.id,
      email: user.email,
      isAdmin: false,
      teamIds: [],
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async logout(userId: string) {
    // Implement logout logic
    return { success: true };
  }

  async validateUser(email: string, password: string) {
    // This would implement actual password validation
    const user = await this.userRepository.findByEmail(email);

    if (user) {
      return {
        id: user.id,
        email: user.email,
      };
    }

    return null;
  }

  async authenticateWithWallet(
    walletAddress: string,
    chainId: string,
    chainType: string
  ) {
    // Use the database auth service for wallet authentication
    return this.databaseAuthService.authenticateWithWallet(
      walletAddress,
      parseInt(chainId),
      chainType
    );
  }

  async authenticateWithMagic(didToken: string, email: string) {
    // Use the database auth service for Magic authentication
    return this.databaseAuthService.authenticateWithMagic({ didToken, email });
  }
}
