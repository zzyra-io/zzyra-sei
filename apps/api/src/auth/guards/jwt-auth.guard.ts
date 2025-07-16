import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, try to authenticate but don't throw if it fails
      try {
        const result = super.canActivate(context);
        if (result instanceof Promise) {
          return result.catch(() => true);
        }
        return result || true;
      } catch {
        return true;
      }
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // For public routes, don't throw errors - just return user if available
    if (isPublic) {
      return user || null;
    }

    // For protected routes, throw error if authentication failed
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
