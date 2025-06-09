import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@Controller("dashboard")
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("metrics")
  @ApiOperation({ summary: "Get dashboard metrics" })
  @ApiResponse({
    status: 200,
    description: "Returns dashboard metrics",
  })
  async getMetrics(@Request() req: { user?: { id: string } }) {
    const userId = req.user?.id || "user1";
    return this.dashboardService.getMetrics(userId);
  }
}
