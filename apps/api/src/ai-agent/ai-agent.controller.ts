import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { AIAgentService } from "./ai-agent.service";
import { AIAgentConfig } from "@zyra/types";
import { Observable, interval, map } from "rxjs";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "src/auth/decorators/public.decorator";

@Controller("ai-agent")
@ApiBearerAuth()
@ApiTags("ai-agent")
export class AIAgentController {
  constructor(private readonly aiAgentService: AIAgentService) {}

  @Get("mcp-servers")
  @Public()
  async getMCPServers() {
    return this.aiAgentService.getAvailableMCPServers();
  }

  @Get("mcp-servers/categories")
  @Public()
  async getMCPServerCategories() {
    return this.aiAgentService.getMCPServersByCategory();
  }

  @Post("mcp-servers/:serverId/test")
  async testMCPServer(
    @Param("serverId") serverId: string,
    @Body() body: { config: Record<string, any> }
  ) {
    return this.aiAgentService.testMCPServer(serverId, body.config);
  }

  @Post("execute")
  async executeAgent(@Body() config: AIAgentConfig) {
    return this.aiAgentService.executeAgent(config);
  }

  @Get("executions/:executionId")
  async getExecution(@Param("executionId") executionId: string) {
    return this.aiAgentService.getExecution(executionId);
  }

  @Post("executions/:executionId/stop")
  async stopExecution(@Param("executionId") executionId: string) {
    return this.aiAgentService.stopExecution(executionId);
  }

  @Sse("executions/:executionId/stream")
  streamExecution(
    @Param("executionId") executionId: string
  ): Observable<MessageEvent> {
    return interval(1000).pipe(
      map(() => ({
        data: JSON.stringify(
          this.aiAgentService.getExecutionStatus(executionId)
        ),
      }))
    );
  }
}
