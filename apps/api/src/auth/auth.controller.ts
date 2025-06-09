import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";

export class LoginDto {
  email: string;
  password: string;
}

export class RegisterDto {
  email: string;
  password: string;
  fullName?: string;
}

export class WalletAuthDto {
  walletAddress: string;
  chainId: string;
  chainType: string;
}

export class MagicAuthDto {
  didToken: string;
  email: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "User login" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post("register")
  @ApiOperation({ summary: "User registration" })
  @ApiResponse({
    status: 201,
    description: "Registration successful",
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName
    );
  }

  @Post("logout")
  @ApiOperation({ summary: "User logout" })
  @ApiResponse({
    status: 200,
    description: "Logout successful",
  })
  async logout(@Request() req: { user?: { id: string } }) {
    const userId = req.user?.id || "anonymous";
    return this.authService.logout(userId);
  }

  @Post("wallet")
  @ApiOperation({ summary: "Wallet authentication" })
  @ApiResponse({
    status: 200,
    description: "Wallet authentication successful",
  })
  async authenticateWithWallet(@Body() walletAuthDto: WalletAuthDto) {
    return this.authService.authenticateWithWallet(
      walletAuthDto.walletAddress,
      walletAuthDto.chainId,
      walletAuthDto.chainType
    );
  }

  @Post("magic")
  @ApiOperation({ summary: "Magic link authentication" })
  @ApiResponse({
    status: 200,
    description: "Magic authentication successful",
  })
  async authenticateWithMagic(@Body() magicAuthDto: MagicAuthDto) {
    return this.authService.authenticateWithMagic(
      magicAuthDto.didToken,
      magicAuthDto.email
    );
  }
}
