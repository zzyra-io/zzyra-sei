import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../database/prisma.service";
import { SessionEventType } from "@zyra/types";
import { createHmac, createHash } from "crypto";

/**
 * Security middleware for rate limiting and transaction validation
 * Following NestJS middleware patterns and security best practices
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  // In-memory rate limiting store (in production, use Redis)
  private readonly rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();

  // In-memory nonce store for replay protection (in production, use Redis)
  private readonly nonceStore = new Map<string, number>();

  // Service auth configuration loaded from environment
  private readonly serviceAuth = {
    worker: {
      id: process.env.SERVICE_AUTH_WORKER_ID || "",
      secret: process.env.SERVICE_AUTH_WORKER_SECRET || "",
    },
    internal: {
      id: process.env.SERVICE_AUTH_INTERNAL_ID || "",
      secret: process.env.SERVICE_AUTH_INTERNAL_SECRET || "",
    },
    skewMs: Number(process.env.SERVICE_AUTH_SKEW_MS || 5 * 60 * 1000),
  } as const;

  // Rate limiting configuration
  private readonly rateLimits = {
    sessionCreation: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
    sessionValidation: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
    sessionUsageUpdate: { maxRequests: 200, windowMs: 60 * 1000 }, // 200 per minute
    default: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 per minute
  };

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();

      // Extract client information
      const clientInfo = this.extractClientInfo(req);

      // Apply rate limiting
      const rateLimitResult = await this.applyRateLimit(req, clientInfo);
      if (!rateLimitResult.allowed) {
        this.logger.warn("Rate limit exceeded", {
          ip: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          endpoint: req.originalUrl,
          limit: rateLimitResult.limit,
        });

        res.status(429).json({
          success: false,
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.retryAfter,
        });
        return;
      }

      // Verify service-to-service HMAC auth when required
      const authCheck = this.verifyServiceAuth(req);

      // Enforce service auth for privileged session-keys endpoints
      const isSessionKeys = req.originalUrl.includes("/session-keys");
      const isValidate = isSessionKeys && req.originalUrl.includes("/validate");
      const isUsage = isSessionKeys && req.originalUrl.includes("/usage");

      if (isValidate || isUsage) {
        if (!authCheck.ok || authCheck.role !== "internal") {
          this.logger.warn("Unauthorized service call to privileged endpoint", {
            endpoint: req.originalUrl,
            serviceId: authCheck.serviceId || "unknown",
          });
          res.status(401).json({ success: false, error: "Unauthorized" });
          return;
        }
      }

      if (authCheck.ok) {
        (req as any).service = {
          id: authCheck.serviceId,
          role: authCheck.role,
        };
      }

      // Apply security headers
      this.applySecurityHeaders(res);

      // Log security-relevant requests
      if (this.isSecurityRelevantEndpoint(req.originalUrl)) {
        await this.logSecurityEvent(req, clientInfo);
      }

      // Add security context to request
      (req as any).security = {
        clientInfo,
        requestId: this.generateRequestId(),
        startTime,
      };

      // Set rate limit headers
      res.set({
        "X-RateLimit-Limit": rateLimitResult.limit.toString(),
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": new Date(rateLimitResult.resetTime).toISOString(),
      });

      next();
    } catch (error) {
      this.logger.error("Security middleware error", error);
      next(); // Continue even if security middleware fails
    }
  }

  /**
   * Verify HMAC service-to-service authentication headers
   */
  private verifyServiceAuth(req: Request): {
    ok: boolean;
    serviceId?: string;
    role?: "worker" | "internal";
  } {
    try {
      const serviceId = (req.headers["x-service-id"] as string) || "";
      const timestampHeader = (req.headers["x-timestamp"] as string) || "";
      const nonce = (req.headers["x-nonce"] as string) || "";
      const signature = (req.headers["x-signature"] as string) || "";

      if (!serviceId || !timestampHeader || !nonce || !signature) {
        return { ok: false };
      }

      const timestamp = Number(timestampHeader);
      if (!Number.isFinite(timestamp)) {
        return { ok: false };
      }

      const now = Date.now();
      if (Math.abs(now - timestamp) > this.serviceAuth.skewMs) {
        return { ok: false };
      }

      // Replay protection
      const existing = this.nonceStore.get(nonce);
      if (existing && existing > now) {
        return { ok: false };
      }

      // Resolve secret and role
      let secret = "";
      let role: "worker" | "internal" | undefined;
      if (
        serviceId === this.serviceAuth.worker.id &&
        this.serviceAuth.worker.secret
      ) {
        secret = this.serviceAuth.worker.secret;
        role = "worker";
      } else if (
        serviceId === this.serviceAuth.internal.id &&
        this.serviceAuth.internal.secret
      ) {
        secret = this.serviceAuth.internal.secret;
        role = "internal";
      } else {
        return { ok: false };
      }

      const bodyString =
        req.body && Object.keys(req.body).length > 0
          ? JSON.stringify(req.body)
          : "";
      const bodyHash = createHash("sha256").update(bodyString).digest("hex");
      const canonical = `${req.method.toUpperCase()}\n${req.originalUrl}\n${bodyHash}\n${timestamp}\n${nonce}`;
      const expected = createHmac("sha256", secret)
        .update(canonical)
        .digest("base64");

      if (signature !== expected) {
        return { ok: false };
      }

      // Store nonce expiry
      this.nonceStore.set(nonce, now + this.serviceAuth.skewMs);
      this.cleanupNonceStore();

      return { ok: true, serviceId, role };
    } catch {
      return { ok: false };
    }
  }

  private cleanupNonceStore(): void {
    const now = Date.now();
    for (const [n, exp] of this.nonceStore.entries()) {
      if (exp <= now) {
        this.nonceStore.delete(n);
      }
    }
  }

  /**
   * Extract client information from request
   */
  private extractClientInfo(req: Request): {
    ip: string;
    userAgent: string;
    userId?: string;
    sessionKeyId?: string;
  } {
    const forwardedFor = req.headers["x-forwarded-for"] as string;
    const ip = forwardedFor
      ? forwardedFor.split(",")[0]
      : req.connection.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";

    // Extract user info from JWT if available
    const userId = (req as any).user?.id;

    // Extract session key ID from URL params if available
    const sessionKeyId = req.params.id;

    return {
      ip: ip.replace(/^::ffff:/, ""), // Remove IPv6 prefix
      userAgent,
      userId,
      sessionKeyId,
    };
  }

  /**
   * Apply rate limiting based on endpoint and client
   */
  private async applyRateLimit(
    req: Request,
    clientInfo: { ip: string; userId?: string }
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const endpoint = req.originalUrl;
    const method = req.method;

    // Determine rate limit configuration
    let rateLimitConfig = this.rateLimits.default;

    if (
      endpoint.includes("/session-keys") &&
      method === "POST" &&
      !endpoint.includes("/validate")
    ) {
      rateLimitConfig = this.rateLimits.sessionCreation;
    } else if (
      endpoint.includes("/session-keys") &&
      endpoint.includes("/validate")
    ) {
      rateLimitConfig = this.rateLimits.sessionValidation;
    } else if (
      endpoint.includes("/session-keys") &&
      endpoint.includes("/usage")
    ) {
      rateLimitConfig = this.rateLimits.sessionUsageUpdate;
    }

    // Create rate limit key (prefer userId over IP for authenticated requests)
    const rateLimitKey = clientInfo.userId
      ? `user:${clientInfo.userId}:${endpoint}:${method}`
      : `ip:${clientInfo.ip}:${endpoint}:${method}`;

    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;

    // Get or create rate limit entry
    let entry = this.rateLimitStore.get(rateLimitKey);

    if (!entry || entry.resetTime <= now) {
      entry = {
        count: 0,
        resetTime: now + rateLimitConfig.windowMs,
      };
    }

    entry.count++;
    this.rateLimitStore.set(rateLimitKey, entry);

    // Clean up old entries periodically
    this.cleanupRateLimitStore();

    const allowed = entry.count <= rateLimitConfig.maxRequests;
    const remaining = Math.max(0, rateLimitConfig.maxRequests - entry.count);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((entry.resetTime - now) / 1000);

    return {
      allowed,
      limit: rateLimitConfig.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  /**
   * Apply security headers to response
   */
  private applySecurityHeaders(res: Response): void {
    res.set({
      // Prevent clickjacking
      "X-Frame-Options": "DENY",

      // Prevent MIME type sniffing
      "X-Content-Type-Options": "nosniff",

      // Enable XSS protection
      "X-XSS-Protection": "1; mode=block",

      // Strict transport security (HTTPS only)
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",

      // Content security policy
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",

      // Referrer policy
      "Referrer-Policy": "strict-origin-when-cross-origin",

      // Feature policy
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
  }

  /**
   * Check if endpoint is security-relevant
   */
  private isSecurityRelevantEndpoint(url: string): boolean {
    const securityEndpoints = ["/session-keys", "/auth/", "/user/", "/admin/"];

    return securityEndpoints.some((endpoint) => url.includes(endpoint));
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(
    req: Request,
    clientInfo: {
      ip: string;
      userAgent: string;
      userId?: string;
      sessionKeyId?: string;
    }
  ): Promise<void> {
    try {
      // Only log if we have a session key ID (session-related operations)
      if (!clientInfo.sessionKeyId) {
        return;
      }

      const eventData = {
        method: req.method,
        endpoint: req.originalUrl,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        userId: clientInfo.userId,
        timestamp: new Date().toISOString(),
        requestBody: this.sanitizeRequestBody(req.body),
      };

      await this.prisma.client.sessionEvent.create({
        data: {
          sessionKeyId: clientInfo.sessionKeyId,
          eventType: this.getEventTypeFromEndpoint(req.originalUrl, req.method),
          eventData,
          severity: "info",
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent,
        },
      });
    } catch (error) {
      this.logger.error("Failed to log security event", error);
      // Don't throw - logging failure shouldn't break the request
    }
  }

  /**
   * Get event type from endpoint
   */
  private getEventTypeFromEndpoint(
    url: string,
    method: string
  ): SessionEventType {
    if (url.includes("/validate")) {
      return SessionEventType.USED;
    } else if (url.includes("/usage") && method === "PUT") {
      return SessionEventType.USED;
    } else if (method === "DELETE") {
      return SessionEventType.REVOKED;
    } else if (method === "POST" && !url.includes("/validate")) {
      return SessionEventType.CREATED;
    }

    return SessionEventType.USED;
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== "object") {
      return body;
    }

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = [
      "userSignature",
      "privateKey",
      "password",
      "token",
      "secret",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Clean up old rate limit entries
   */
  private cleanupRateLimitStore(): void {
    // Run cleanup every 100 requests
    if (Math.random() > 0.01) return;

    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (entry.resetTime <= now) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}

/**
 * Rate limiting decorator for specific endpoints
 */
export function RateLimit(maxRequests: number, windowMs: number) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0]; // Assuming first argument is request

      // Custom rate limiting logic can be added here
      // For now, rely on the middleware

      return method.apply(this, args);
    };
  };
}

/**
 * IP whitelist middleware for admin endpoints
 */
@Injectable()
export class AdminSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AdminSecurityMiddleware.name);

  // In production, load from environment variables
  private readonly allowedIPs = [
    "127.0.0.1",
    "::1",
    "localhost",
    // Add your admin IPs here
  ];

  use(req: Request, res: Response, next: NextFunction): void {
    const forwardedFor = req.headers["x-forwarded-for"] as string;
    const clientIP = forwardedFor
      ? forwardedFor.split(",")[0]
      : req.connection.remoteAddress;
    const cleanIP = clientIP?.replace(/^::ffff:/, "") || "unknown";

    // Check if IP is allowed for admin endpoints
    if (
      req.originalUrl.includes("/admin/") &&
      !this.allowedIPs.includes(cleanIP)
    ) {
      this.logger.warn(
        `Unauthorized admin access attempt from IP: ${cleanIP}`,
        {
          ip: cleanIP,
          userAgent: req.headers["user-agent"],
          endpoint: req.originalUrl,
        }
      );

      res.status(403).json({
        success: false,
        error: "Access denied",
      });
      return;
    }

    next();
  }
}
