import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpException,
  HttpStatus,
  Response,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import {
  UserRepository,
  WalletRepository,
  WorkflowRepository,
  ExecutionRepository,
  NotificationRepository,
  AuthService,
} from "@zyra/database";

@ApiTags("api")
@Controller("api")
export class AppController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletRepository: WalletRepository,
    private readonly workflowRepository: WorkflowRepository,
    private readonly executionRepository: ExecutionRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly authService: AuthService
  ) {}

  // Helper method to get user from session - this should be replaced with proper auth guard
  private async getUserFromSession(
    req?: any
  ): Promise<{ id: string; email?: string }> {
    // For now, return a mock user - this would be replaced with real session/JWT validation
    // In a real implementation, this would extract user from JWT token or session
    return {
      id: "user-123", // This should come from validated session/JWT
      email: "test@example.com",
    };
  }

  // Auth endpoints
  @Post("auth/login")
  @ApiOperation({ summary: "User login with Magic Link" })
  async login(
    @Body()
    body: {
      email: string;
      didToken: string;
      isOAuth?: boolean;
      oauthProvider?: string;
      oauthUserInfo?: any;
      callbackUrl?: string;
    },
    @Request() req: any,
    @Response() res: any
  ) {
    try {
      const {
        email,
        didToken,
        isOAuth,
        oauthProvider,
        oauthUserInfo,
        callbackUrl,
      } = body;

      if (!email || !didToken) {
        throw new HttpException(
          "Email and DID token are required",
          HttpStatus.BAD_REQUEST
        );
      }

      console.log("Login route: Received authentication data", {
        email,
        didToken: didToken ? "[PRESENT]" : "[MISSING]",
        isOAuth,
        oauthProvider,
        hasOAuthUserInfo: !!oauthUserInfo,
        callbackUrl,
      });

      // Authenticate with Magic Link using the exact same payload structure
      const magicPayload = {
        email,
        didToken,
        isOAuth,
        oauthProvider,
        oauthUserInfo,
      };

      const { session, user } =
        await this.authService.authenticateWithMagic(magicPayload);
      console.log("Auth Result:", { user, session });

      if (!session || !session.accessToken || !user) {
        console.error(
          "Login route: Authentication successful but no session tokens or user returned"
        );
        throw new HttpException(
          "Authentication failed: Invalid session",
          HttpStatus.UNAUTHORIZED
        );
      }

      // Create JWT token (in NestJS, you'd use JwtService)
      const token = {
        sub: user.id,
        email: user.email || "",
        name: user.email ? user.email.split("@")[0] : "User",
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      };

      // Set cookies using NestJS response
      const cookieName =
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token";

      // Set session cookie
      res.cookie(cookieName, "encoded-session-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Set access token cookie
      res.cookie("token", session.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 1000, // 1 day
      });

      // Set refresh token cookie if available
      if (session.refreshToken) {
        res.cookie("refresh_token", session.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
        });
      }

      // Clean callbackUrl
      let finalCallbackUrl = "/dashboard";
      try {
        if (callbackUrl) {
          const url = new URL(
            callbackUrl,
            req.headers.origin || "http://localhost:3000"
          );
          if (!url.pathname.startsWith("/login")) {
            finalCallbackUrl = url.toString();
          }
        }
      } catch {
        // Use default if invalid
      }

      // Return response matching Next.js format
      return res.json({
        session: {
          expiresAt: session.expiresAt,
          user: {
            id: user.id,
            email: user.email,
            name: user.email ? user.email.split("@")[0] : "User",
          },
        },
        user,
        success: true,
        callbackUrl: finalCallbackUrl,
      });
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      throw new HttpException(errorMessage, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post("auth/logout")
  @ApiOperation({ summary: "User logout" })
  async logout(@Request() req: any, @Response() res: any) {
    try {
      // Extract token from cookies to identify the user
      const token = req.cookies?.token;
      if (token) {
        try {
          // Verify token to get userId (you'd implement this method)
          const userId = this.authService.verifySession(token);
          if (userId) {
            // Sign out the user to invalidate all tokens
            await this.authService.signOut(userId);
            console.log(`Logged out user with ID: ${userId}`);
          }
        } catch (serviceError) {
          // Don't fail the logout if the service call fails
          console.error(
            "Failed to invalidate tokens during logout:",
            serviceError
          );
        }
      }

      // Clear the authentication cookies
      res.clearCookie("token");
      res.clearCookie("refresh_token");
      res.clearCookie("next-auth.session-token");
      res.clearCookie("__Secure-next-auth.session-token");

      return res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      throw new HttpException(
        "Failed to logout",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // User endpoints
  @Get("user/profile")
  @ApiOperation({ summary: "Get user profile" })
  async getUserProfile(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const profile = await this.userRepository.getProfile(user.id);

      if (!profile) {
        // Return default profile if none exists
        return {
          id: user.id,
          full_name: "",
          email_notifications: true,
          telegram_handle: "",
          discord_webhook: "",
          dark_mode: false,
          subscription_tier: "free",
          subscription_status: "active",
          subscription_expires_at: null,
          monthly_execution_quota: 100,
          monthly_executions_used: 0,
          updated_at: new Date().toISOString(),
        };
      }

      return profile;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch user profile",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put("user/profile")
  @ApiOperation({ summary: "Update user profile" })
  async updateUserProfile(@Body() body: any, @Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const updatedProfile = await this.userRepository.updateProfile(user.id, {
        fullName: body.full_name,
        emailNotifications: body.email_notifications,
        telegramHandle: body.telegram_handle,
        discordWebhook: body.discord_webhook,
        darkMode: body.dark_mode,
      });

      return updatedProfile;
    } catch (error) {
      throw new HttpException(
        "Failed to update user profile",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("user/usage")
  @ApiOperation({ summary: "Get user usage" })
  async getUserUsage(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const usage = await this.userRepository.getUsage(user.id);
      return usage;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch user usage",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("user/wallets")
  @ApiOperation({ summary: "Get user wallets" })
  async getUserWallets(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const wallets = await this.walletRepository.findByUserId(user.id);
      return wallets;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch user wallets",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("user/wallets")
  @ApiOperation({ summary: "Create or update wallet" })
  async createOrUpdateWallet(
    @Body()
    body: {
      walletAddress: string;
      chainId: string;
      walletType?: string;
      chainType?: string;
      metadata?: any;
    },
    @Request() req: any
  ) {
    const user = await this.getUserFromSession(req);

    const { walletAddress, chainId, walletType, chainType, metadata } = body;

    if (!walletAddress || !chainId) {
      throw new HttpException(
        "Wallet address and chain ID are required",
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      // Check if wallet already exists
      const existingWallet =
        await this.walletRepository.findByAddress(walletAddress);

      if (existingWallet && existingWallet.userId !== user.id) {
        throw new HttpException(
          "This wallet is already connected to another account",
          HttpStatus.CONFLICT
        );
      }

      let wallet;
      if (existingWallet && existingWallet.userId === user.id) {
        // Update existing wallet
        wallet = await this.walletRepository.update(existingWallet.id, {
          chainId,
          walletType,
          chainType,
          metadata: {
            ...existingWallet.metadata,
            ...metadata,
            lastUpdated: new Date().toISOString(),
          },
        });
      } else {
        // Create new wallet
        wallet = await this.walletRepository.create({
          userId: user.id,
          walletAddress,
          chainId,
          walletType: walletType || "unknown",
          chainType: chainType || "evm",
          metadata: {
            ...metadata,
            createdAt: new Date().toISOString(),
            userEmail: user.email,
          },
        });
      }

      return {
        wallet,
        success: true,
        message: existingWallet ? "Wallet updated" : "Wallet created",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to save user wallet",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("user/wallets")
  @ApiOperation({ summary: "Delete wallet" })
  async deleteWallet(
    @Body() body: { walletAddress: string },
    @Request() req: any
  ) {
    const user = await this.getUserFromSession(req);

    try {
      const wallet = await this.walletRepository.findByAddress(
        body.walletAddress
      );

      if (!wallet || wallet.userId !== user.id) {
        throw new HttpException("Wallet not found", HttpStatus.NOT_FOUND);
      }

      await this.walletRepository.delete(wallet.id);
      return { success: true, message: "Wallet deleted" };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to delete wallet",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("user/wallets/transactions")
  @ApiOperation({ summary: "Get wallet transactions" })
  async getWalletTransactions(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const transactions = await this.walletRepository.getTransactions(user.id);
      return transactions;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch wallet transactions",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Dashboard endpoints
  @Get("dashboard/metrics")
  @ApiOperation({ summary: "Get dashboard metrics" })
  async getDashboardMetrics(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      // Get metrics using execution repository
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentExecutions = await this.executionRepository.findByUserId(
        user.id,
        {
          startDate: oneWeekAgo,
          endDate: now,
        }
      );

      const workflows = await this.workflowRepository.findByUserId(user.id);

      const successfulExecutions = recentExecutions.filter(
        (exec) => exec.status === "completed"
      );
      const successRate =
        recentExecutions.length > 0
          ? Math.round(
              (successfulExecutions.length / recentExecutions.length) * 100
            )
          : 0;

      // Calculate average duration
      let totalDurationMs = 0;
      let completedWithDuration = 0;

      for (const exec of successfulExecutions) {
        if (exec.completedAt && exec.startedAt) {
          const duration =
            new Date(exec.completedAt).getTime() -
            new Date(exec.startedAt).getTime();
          totalDurationMs += duration;
          completedWithDuration++;
        }
      }

      const avgDurationMs =
        completedWithDuration > 0
          ? Math.round(totalDurationMs / completedWithDuration)
          : 0;

      const formatDuration = (ms: number): string => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
      };

      return {
        successRate,
        totalExecutions: recentExecutions.length,
        averageDuration: formatDuration(avgDurationMs),
        rawAverageDurationMs: avgDurationMs,
        activeWorkflows: workflows.length,
        changeFromLastWeek: {
          successRate: 0, // Would need previous week data
          totalExecutions: 0,
          averageDuration: 0,
        },
      };
    } catch (error) {
      throw new HttpException(
        "Failed to fetch dashboard metrics",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Workflow endpoints
  @Get("workflows")
  @ApiOperation({ summary: "Get workflows" })
  async getWorkflows(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const workflows = await this.workflowRepository.findByUserId(user.id);

      // Map to match frontend format
      const mappedWorkflows = workflows.map((workflow) => ({
        ...workflow,
        is_public: workflow.isPublic,
        user_id: workflow.userId,
        created_at:
          workflow.createdAt?.toISOString() || new Date().toISOString(),
        updated_at:
          workflow.updatedAt?.toISOString() ||
          workflow.createdAt?.toISOString() ||
          new Date().toISOString(),
        isFavorite: false, // Would need to implement favorites
      }));

      return mappedWorkflows;
    } catch (error) {
      throw new HttpException(
        "Failed to fetch workflows",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("workflows")
  @ApiOperation({ summary: "Create workflow" })
  async createWorkflow(
    @Body()
    body: {
      name?: string;
      description?: string;
      nodes?: any[];
      edges?: any[];
      is_public?: boolean;
      tags?: string[];
    },
    @Request() req: any
  ) {
    const user = await this.getUserFromSession(req);

    try {
      const createData = {
        name: body.name || "New Workflow",
        description: body.description || "",
        nodes: body.nodes || [],
        edges: body.edges || [],
        isPublic: body.is_public || false,
        tags: body.tags || [],
        userId: user.id,
      };

      const newWorkflow = await this.workflowRepository.create(
        createData,
        user.id
      );

      // Map to frontend format
      return {
        ...newWorkflow,
        is_public: newWorkflow.isPublic,
        user_id: newWorkflow.userId,
        created_at:
          newWorkflow.createdAt?.toISOString() || new Date().toISOString(),
        updated_at:
          newWorkflow.updatedAt?.toISOString() ||
          newWorkflow.createdAt?.toISOString() ||
          new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        "Failed to create workflow",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("workflows/:id")
  @ApiOperation({ summary: "Get workflow by ID" })
  @ApiParam({ name: "id", description: "Workflow ID" })
  async getWorkflow(@Param("id") id: string, @Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const workflow = await this.workflowRepository.findById(id, user.id);

      if (!workflow) {
        throw new HttpException("Workflow not found", HttpStatus.NOT_FOUND);
      }

      return {
        ...workflow,
        is_public: workflow.isPublic,
        user_id: workflow.userId,
        created_at:
          workflow.createdAt?.toISOString() || new Date().toISOString(),
        updated_at:
          workflow.updatedAt?.toISOString() ||
          workflow.createdAt?.toISOString() ||
          new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch workflow",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put("workflows/:id")
  @ApiOperation({ summary: "Update workflow" })
  @ApiParam({ name: "id", description: "Workflow ID" })
  async updateWorkflow(
    @Param("id") id: string,
    @Body() body: any,
    @Request() req: any
  ) {
    const user = await this.getUserFromSession(req);

    try {
      const updatedWorkflow = await this.workflowRepository.update(
        id,
        body,
        user.id
      );
      return updatedWorkflow;
    } catch (error) {
      throw new HttpException(
        "Failed to update workflow",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete("workflows/:id")
  @ApiOperation({ summary: "Delete workflow" })
  @ApiParam({ name: "id", description: "Workflow ID" })
  async deleteWorkflow(@Param("id") id: string, @Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      await this.workflowRepository.delete(id, user.id);
      return { success: true, message: "Workflow deleted" };
    } catch (error) {
      throw new HttpException(
        "Failed to delete workflow",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Execution endpoints
  @Get("executions")
  @ApiOperation({ summary: "Get executions" })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "sortKey", required: false })
  @ApiQuery({ name: "sortOrder", required: false })
  async getExecutions(
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
    @Query("status") status?: string,
    @Query("sortKey") sortKey?: string,
    @Query("sortOrder") sortOrder?: string,
    @Request() req?: any
  ) {
    const user = await this.getUserFromSession(req);

    try {
      const executions = await this.executionRepository.findByUserId(user.id, {
        limit,
        offset,
        status,
        sortKey,
        sortOrder,
      });

      return {
        data: executions,
        total: executions.length,
        page: 1,
        limit: limit || 10,
      };
    } catch (error) {
      throw new HttpException(
        "Failed to fetch executions",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("executions")
  @ApiOperation({ summary: "Create execution" })
  async createExecution(
    @Body() body: { workflowId: string },
    @Request() req: any
  ) {
    const user = await this.getUserFromSession(req);

    try {
      const execution = await this.executionRepository.create({
        workflowId: body.workflowId,
        userId: user.id,
        triggeredBy: user.id,
        status: "pending",
        startedAt: new Date(),
      });

      return { executionId: execution.id };
    } catch (error) {
      throw new HttpException(
        "Failed to create execution",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("executions/:id")
  @ApiOperation({ summary: "Get execution by ID" })
  @ApiParam({ name: "id", description: "Execution ID" })
  async getExecution(@Param("id") id: string) {
    return {
      id,
      status: "pending",
      workflow_id: "test",
      started_at: new Date().toISOString(),
    };
  }

  @Post("executions/:id/retry")
  @ApiOperation({ summary: "Retry execution" })
  @ApiParam({ name: "id", description: "Execution ID" })
  async retryExecution(@Param("id") id: string) {
    return { success: true, message: "Execution retried" };
  }

  @Post("executions/:id/cancel")
  @ApiOperation({ summary: "Cancel execution" })
  @ApiParam({ name: "id", description: "Execution ID" })
  async cancelExecution(@Param("id") id: string) {
    return { success: true, message: "Execution cancelled" };
  }

  @Post("executions/:id/pause")
  @ApiOperation({ summary: "Pause execution" })
  @ApiParam({ name: "id", description: "Execution ID" })
  async pauseExecution(@Param("id") id: string) {
    return { success: true, message: "Execution paused" };
  }

  @Post("executions/:id/resume")
  @ApiOperation({ summary: "Resume execution" })
  @ApiParam({ name: "id", description: "Execution ID" })
  async resumeExecution(@Param("id") id: string) {
    return { success: true, message: "Execution resumed" };
  }

  @Get("executions/stats")
  @ApiOperation({ summary: "Get execution stats" })
  async getExecutionStats() {
    return {
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
      pending: 0,
      success_rate: 0,
    };
  }

  @Get("executions/trends")
  @ApiOperation({ summary: "Get execution trends" })
  async getExecutionTrends() {
    return { trends: [] };
  }

  @Get("executions/heatmap")
  @ApiOperation({ summary: "Get execution heatmap" })
  async getExecutionHeatmap() {
    return { heatmap: [] };
  }

  @Get("executions/:id/node-executions")
  @ApiOperation({ summary: "Get node executions" })
  @ApiParam({ name: "id", description: "Execution ID" })
  async getNodeExecutions(@Param("id") id: string) {
    return [];
  }

  @Get("executions/node-logs")
  @ApiOperation({ summary: "Get node logs" })
  async getNodeLogs() {
    return [];
  }

  @Get("executions/nodes")
  @ApiOperation({ summary: "Get execution nodes" })
  async getExecutionNodes() {
    return [];
  }

  // Block endpoints
  @Get("block-types")
  @ApiOperation({ summary: "Get block types" })
  async getBlockTypes() {
    // This should use BLOCK_CATALOG from @zyra/types
    return [
      {
        id: "fetch",
        name: "HTTP Request",
        category: "communication",
        description: "Make HTTP requests to external APIs",
        inputs: [
          { name: "url", type: "string", required: true },
          { name: "method", type: "string", required: true },
        ],
        outputs: [{ name: "response", type: "object" }],
      },
    ];
  }

  @Get("block-schema")
  @ApiOperation({ summary: "Get block schema" })
  @ApiQuery({ name: "blockType", required: true })
  async getBlockSchema(@Query("blockType") blockType: string) {
    return { type: "object", properties: {} };
  }

  @Get("custom-blocks")
  @ApiOperation({ summary: "Get custom blocks" })
  async getCustomBlocks() {
    return [];
  }

  @Post("custom-blocks")
  @ApiOperation({ summary: "Create custom block" })
  async createCustomBlock(@Body() body: any) {
    return { success: true, message: "Custom block created" };
  }

  @Get("custom-blocks/:id")
  @ApiOperation({ summary: "Get custom block" })
  @ApiParam({ name: "id", description: "Block ID" })
  async getCustomBlock(@Param("id") id: string) {
    return {
      id,
      name: "Custom Block",
      code: "// Custom code",
      inputs: [],
      outputs: [],
    };
  }

  @Put("custom-blocks/:id")
  @ApiOperation({ summary: "Update custom block" })
  @ApiParam({ name: "id", description: "Block ID" })
  async updateCustomBlock(@Param("id") id: string, @Body() body: any) {
    return { success: true, message: "Custom block updated" };
  }

  @Delete("custom-blocks/:id")
  @ApiOperation({ summary: "Delete custom block" })
  @ApiParam({ name: "id", description: "Block ID" })
  async deleteCustomBlock(@Param("id") id: string) {
    return { success: true, message: "Custom block deleted" };
  }

  // Notification endpoints
  @Get("notifications")
  @ApiOperation({ summary: "Get notifications" })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "channel", required: false })
  @ApiQuery({ name: "status", required: false })
  async getNotifications(
    @Query("limit") limit?: number,
    @Query("page") page?: number,
    @Query("type") type?: string,
    @Query("channel") channel?: string,
    @Query("status") status?: string,
    @Request() req?: any
  ) {
    const user = await this.getUserFromSession(req);

    try {
      const notifications = await this.notificationRepository.findByUserId(
        user.id,
        {
          page: page || 1,
          limit: limit || 50,
        }
      );

      return {
        data: notifications,
        pagination: {
          total: notifications.length,
          page: page || 1,
          limit: limit || 50,
          pages: Math.ceil(notifications.length / (limit || 50)),
        },
      };
    } catch (error) {
      throw new HttpException(
        "Failed to fetch notifications",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("notifications/mark-all-read")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllNotificationsRead(@Request() req: any) {
    const user = await this.getUserFromSession(req);

    try {
      const count = await this.notificationRepository.markAllAsRead(user.id);
      return { success: true, marked_count: count };
    } catch (error) {
      throw new HttpException(
        "Failed to mark notifications as read",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("notification-logs")
  @ApiOperation({ summary: "Get notification logs" })
  async getNotificationLogs() {
    return [];
  }

  @Post("test-notification")
  @ApiOperation({ summary: "Send test notification" })
  async sendTestNotification(
    @Body() body: { type: string; title: string; message: string }
  ) {
    return { success: true, message: "Test notification sent" };
  }

  // Billing endpoints
  @Post("billing/checkout")
  @ApiOperation({ summary: "Create checkout session" })
  async createCheckout(@Body() body: any, @Request() req: any) {
    const user = await this.getUserFromSession(req);

    // Stripe integration would go here
    return {
      url: "https://checkout.stripe.com/session-id",
      sessionId: "cs_test_123",
    };
  }

  @Post("billing/webhook")
  @ApiOperation({ summary: "Handle billing webhook" })
  async handleBillingWebhook(@Body() body: any) {
    return { success: true };
  }

  // AI endpoints
  @Post("ai/generate-block")
  @ApiOperation({ summary: "Generate block using AI" })
  async generateBlock(@Body() body: any) {
    return {
      success: true,
      block: {
        name: "Generated Block",
        code: "// Generated code",
        description: "AI generated block",
      },
    };
  }

  // Additional utility endpoints
  @Post("execute-workflow")
  @ApiOperation({ summary: "Execute workflow" })
  async executeWorkflow(@Body() body: { workflowId: string }) {
    return { success: true, executionId: "exec_123" };
  }

  @Get("execute-workflow/:executionId")
  @ApiOperation({ summary: "Get workflow execution" })
  @ApiParam({ name: "executionId", description: "Execution ID" })
  async getWorkflowExecution(@Param("executionId") executionId: string) {
    return { id: executionId, status: "running" };
  }

  @Post("execute-workflow-node")
  @ApiOperation({ summary: "Execute workflow node" })
  async executeWorkflowNode(@Body() body: any) {
    return { success: true, message: "Node executed" };
  }

  @Post("send-email")
  @ApiOperation({ summary: "Send email" })
  async sendEmail(@Body() body: any) {
    return { success: true, message: "Email sent" };
  }

  @Get("usage")
  @ApiOperation({ summary: "Get API usage" })
  async getUsage() {
    return { usage: 0, limit: 1000 };
  }

  @Post("generate-flow")
  @ApiOperation({ summary: "Generate workflow flow" })
  async generateFlow(@Body() body: any) {
    return { success: true, flow: { nodes: [], edges: [] } };
  }

  @Post("feedback")
  @ApiOperation({ summary: "Submit feedback" })
  async submitFeedback(@Body() body: any) {
    return { success: true, message: "Feedback submitted" };
  }
}
