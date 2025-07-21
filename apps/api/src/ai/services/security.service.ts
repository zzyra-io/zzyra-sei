import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SecurityValidationResult {
  isSecure: boolean;
  issues: SecurityIssue[];
  sanitizedInput?: string;
}

interface SecurityIssue {
  type: 'prompt_injection' | 'code_injection' | 'sensitive_data' | 'malicious_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion?: string;
}

interface CodeAnalysisResult {
  isSafe: boolean;
  issues: SecurityIssue[];
  sanitizedCode?: string;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  
  constructor(private configService: ConfigService) {}

  /**
   * Sanitize user input to prevent prompt injection attacks
   */
  sanitizePromptInput(input: string): SecurityValidationResult {
    const issues: SecurityIssue[] = [];
    let sanitizedInput = input;

    // Check for prompt injection patterns
    const injectionPatterns = [
      {
        pattern: /ignore\s+(?:previous|above|all)\s+(?:instructions?|prompts?|commands?)/i,
        type: 'prompt_injection' as const,
        severity: 'high' as const,
        description: 'Potential prompt injection: ignore previous instructions',
      },
      {
        pattern: /(?:system|assistant|user):\s*(?:now|from now on|instead)/i,
        type: 'prompt_injection' as const,
        severity: 'high' as const,
        description: 'Potential role manipulation attempt',
      },
      {
        pattern: /\[SYSTEM\]|\[\/SYSTEM\]|\[INST\]|\[\/INST\]/i,
        type: 'prompt_injection' as const,
        severity: 'medium' as const,
        description: 'Potential system tag injection',
      },
      {
        pattern: /```[\s\S]*?```/g,
        type: 'prompt_injection' as const,
        severity: 'low' as const,
        description: 'Code block detected - may contain injection attempts',
      },
      {
        pattern: /<script[\s\S]*?<\/script>/i,
        type: 'code_injection' as const,
        severity: 'critical' as const,
        description: 'Script tag detected',
      },
    ];

    for (const { pattern, type, severity, description } of injectionPatterns) {
      const matches = sanitizedInput.match(pattern);
      if (matches) {
        issues.push({
          type,
          severity,
          description,
          location: matches[0],
          suggestion: this.getSuggestionForIssue(type),
        });

        // Sanitize based on severity
        if (severity === 'critical' || severity === 'high') {
          sanitizedInput = sanitizedInput.replace(pattern, '[FILTERED]');
        }
      }
    }

    // Check for excessive length (potential DoS)
    if (sanitizedInput.length > 50000) {
      issues.push({
        type: 'prompt_injection',
        severity: 'medium',
        description: 'Input exceeds maximum length',
        suggestion: 'Limit input to reasonable size',
      });
      sanitizedInput = sanitizedInput.substring(0, 50000) + '... [TRUNCATED]';
    }

    // Check for suspicious unicode/encoding
    const suspiciousUnicode = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064]/g;
    if (suspiciousUnicode.test(sanitizedInput)) {
      issues.push({
        type: 'prompt_injection',
        severity: 'medium',
        description: 'Suspicious unicode characters detected',
        suggestion: 'Remove zero-width and directional characters',
      });
      sanitizedInput = sanitizedInput.replace(suspiciousUnicode, '');
    }

    this.logger.debug(`Prompt security validation: ${issues.length} issues found`);

    return {
      isSecure: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      sanitizedInput: sanitizedInput !== input ? sanitizedInput : undefined,
    };
  }

  /**
   * Analyze generated code for security vulnerabilities
   */
  analyzeCodeSecurity(code: string): CodeAnalysisResult {
    const issues: SecurityIssue[] = [];
    let sanitizedCode = code;

    // Dangerous function patterns
    const dangerousFunctions = [
      {
        pattern: /eval\s*\(/g,
        severity: 'critical' as const,
        description: 'eval() function usage - allows arbitrary code execution',
      },
      {
        pattern: /Function\s*\(/g,
        severity: 'critical' as const,
        description: 'Function constructor usage - allows dynamic code execution',
      },
      {
        pattern: /setTimeout\s*\(\s*["'`][^"'`]*["'`]/g,
        severity: 'high' as const,
        description: 'setTimeout with string argument - potential code injection',
      },
      {
        pattern: /setInterval\s*\(\s*["'`][^"'`]*["'`]/g,
        severity: 'high' as const,
        description: 'setInterval with string argument - potential code injection',
      },
    ];

    // Node.js specific dangerous modules and functions
    const dangerousNodePatterns = [
      {
        pattern: /require\s*\(\s*["'`]child_process["'`]/g,
        severity: 'critical' as const,
        description: 'child_process module - allows system command execution',
      },
      {
        pattern: /require\s*\(\s*["'`]fs["'`]/g,
        severity: 'high' as const,
        description: 'fs module - allows file system access',
      },
      {
        pattern: /require\s*\(\s*["'`]net["'`]/g,
        severity: 'high' as const,
        description: 'net module - allows network operations',
      },
      {
        pattern: /process\.exit\s*\(/g,
        severity: 'medium' as const,
        description: 'process.exit - can terminate the application',
      },
      {
        pattern: /process\.env\s*\[/g,
        severity: 'medium' as const,
        description: 'Environment variable access - potential sensitive data exposure',
      },
    ];

    // Browser specific dangerous patterns
    const dangerousBrowserPatterns = [
      {
        pattern: /document\.cookie/g,
        severity: 'medium' as const,
        description: 'Cookie access - potential sensitive data exposure',
      },
      {
        pattern: /localStorage|sessionStorage/g,
        severity: 'medium' as const,
        description: 'Local storage access - potential data exposure',
      },
      {
        pattern: /window\.location\s*=/g,
        severity: 'medium' as const,
        description: 'Location manipulation - potential redirect attacks',
      },
    ];

    // Network/HTTP patterns
    const networkPatterns = [
      {
        pattern: /XMLHttpRequest|fetch\s*\(/g,
        severity: 'medium' as const,
        description: 'Network requests - potential data exfiltration',
      },
      {
        pattern: /WebSocket\s*\(/g,
        severity: 'medium' as const,
        description: 'WebSocket usage - potential data leakage',
      },
    ];

    const allPatterns = [
      ...dangerousFunctions,
      ...dangerousNodePatterns,
      ...dangerousBrowserPatterns,
      ...networkPatterns,
    ];

    // Check each pattern
    for (const { pattern, severity, description } of allPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        for (const match of matches) {
          issues.push({
            type: 'code_injection',
            severity,
            description,
            location: match,
            suggestion: this.getCodeSanitizationSuggestion(match),
          });
        }

        // Sanitize critical issues
        if (severity === 'critical') {
          sanitizedCode = sanitizedCode.replace(pattern, '/* [BLOCKED_DANGEROUS_FUNCTION] */');
        }
      }
    }

    // Check for potential data exfiltration URLs
    const urlPattern = /https?:\/\/[^\s"'`;,)}\]]+/g;
    const urls = code.match(urlPattern);
    if (urls) {
      for (const url of urls) {
        if (!this.isAllowedDomain(url)) {
          issues.push({
            type: 'sensitive_data',
            severity: 'medium',
            description: `Potentially suspicious URL: ${url}`,
            location: url,
            suggestion: 'Verify if this URL is necessary and trusted',
          });
        }
      }
    }

    // Check for hardcoded secrets/keys
    const secretPatterns = [
      {
        pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'`][^"'`]{8,}["'`]/gi,
        description: 'Potential hardcoded API key or secret',
      },
      {
        pattern: /["'`][A-Za-z0-9+/]{32,}={0,2}["'`]/g,
        description: 'Potential base64-encoded secret',
      },
    ];

    for (const { pattern, description } of secretPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: 'sensitive_data',
          severity: 'high',
          description,
          suggestion: 'Use environment variables or secure configuration',
        });
      }
    }

    // Check for infinite loops or resource exhaustion
    const resourceExhaustionPatterns = [
      {
        pattern: /while\s*\(\s*true\s*\)/g,
        description: 'Potential infinite loop detected',
      },
      {
        pattern: /for\s*\(\s*;\s*;\s*\)/g,
        description: 'Potential infinite loop detected',
      },
    ];

    for (const { pattern, description } of resourceExhaustionPatterns) {
      if (pattern.test(code)) {
        issues.push({
          type: 'malicious_pattern',
          severity: 'high',
          description,
          suggestion: 'Add proper loop conditions and limits',
        });
      }
    }

    this.logger.debug(`Code security analysis: ${issues.length} issues found`);

    return {
      isSafe: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      sanitizedCode: sanitizedCode !== code ? sanitizedCode : undefined,
    };
  }

  /**
   * Create a secure sandbox configuration for code execution
   */
  createSandboxConfig(): Record<string, unknown> {
    return {
      timeout: 30000, // 30 second timeout
      memory: 128 * 1024 * 1024, // 128MB memory limit
      allowedModules: [
        'crypto',
        'util',
        'url',
        'querystring',
        'path',
      ],
      blockedModules: [
        'child_process',
        'fs',
        'net',
        'http',
        'https',
        'dgram',
        'dns',
        'os',
        'process',
        'cluster',
      ],
      blockedGlobals: [
        'process',
        'global',
        'Buffer',
        'require',
        'module',
        'exports',
        '__dirname',
        '__filename',
      ],
      allowedAPIs: [
        'JSON',
        'Math',
        'Date',
        'String',
        'Number',
        'Boolean',
        'Array',
        'Object',
        'RegExp',
        'parseInt',
        'parseFloat',
        'isNaN',
        'isFinite',
        'encodeURIComponent',
        'decodeURIComponent',
      ],
    };
  }

  /**
   * Validate if a domain is allowed for external requests
   */
  private isAllowedDomain(url: string): boolean {
    const allowedDomains = this.configService.get<string[]>('ALLOWED_DOMAINS', [
      'api.openrouter.ai',
      'api.openai.com',
      'localhost',
      '127.0.0.1',
    ]);

    try {
      const urlObj = new URL(url);
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get suggestion for resolving a security issue
   */
  private getSuggestionForIssue(type: SecurityIssue['type']): string {
    switch (type) {
      case 'prompt_injection':
        return 'Use input validation and sanitization before processing';
      case 'code_injection':
        return 'Execute code in a secure sandbox environment';
      case 'sensitive_data':
        return 'Use secure configuration management for sensitive data';
      case 'malicious_pattern':
        return 'Review and validate the pattern for legitimate use';
      default:
        return 'Review and validate the detected pattern';
    }
  }

  /**
   * Get specific suggestion for code sanitization
   */
  private getCodeSanitizationSuggestion(match: string): string {
    if (match.includes('eval')) {
      return 'Use JSON.parse() or safe alternatives instead of eval()';
    }
    if (match.includes('Function')) {
      return 'Define functions statically instead of using Function constructor';
    }
    if (match.includes('child_process')) {
      return 'Use controlled APIs instead of direct system access';
    }
    if (match.includes('fs')) {
      return 'Use controlled file operations or avoid filesystem access';
    }
    return 'Replace with safer alternatives or validate necessity';
  }

  /**
   * Generate security headers for API responses
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; object-src 'none';",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }
}