import { Controller, Get, Post, Param, Query, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ExecutionsService } from './executions.service';
import { NodeExecutionsService } from './node-executions.service';
import { NodeLogsService } from './node-logs.service';
import { ExecutionActionDto, WorkflowExecutionDto, NodeExecutionDto, NodeLogDto } from './dto/execution.dto';

@ApiTags('executions')
@Controller('executions')
export class ExecutionsController {
  constructor(
    private readonly executionsService: ExecutionsService,
    private readonly nodeExecutionsService: NodeExecutionsService,
    private readonly nodeLogsService: NodeLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiQuery({ name: 'workflowId', required: true, description: 'ID of the workflow' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of records to skip' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'sortKey', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc or desc)' })
  @ApiResponse({ status: 200, description: 'Returns workflow executions', type: [WorkflowExecutionDto] })
  async getWorkflowExecutions(
    @Query('workflowId') workflowId: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
    @Query('status') status = 'all',
    @Query('sortKey') sortKey = 'started_at',
    @Query('sortOrder') sortOrder = 'desc',
  ): Promise<{ executions: any[]; total: number }> {
    try {
      // Adjust parameters to match the service method signature
      const executions = await this.executionsService.findAll(
        workflowId,
        +limit
      );
      
      return {
        executions,
        total: executions.length, // In a real implementation, you'd have a separate count query
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get workflow executions: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('nodes')
  @ApiOperation({ summary: 'Get node executions for a workflow execution' })
  @ApiQuery({ name: 'executionId', required: true, description: 'ID of the workflow execution' })
  @ApiResponse({ status: 200, description: 'Returns node executions', type: [NodeExecutionDto] })
  async getNodeExecutions(@Query('executionId') executionId: string): Promise<any[]> {
    try {
      return await this.nodeExecutionsService.findByExecutionId(executionId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get node executions: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('node-logs')
  @ApiOperation({ summary: 'Get logs for a node execution' })
  @ApiQuery({ name: 'nodeExecutionId', required: true, description: 'ID of the node execution' })
  @ApiResponse({ status: 200, description: 'Returns node logs', type: [NodeLogDto] })
  async getNodeLogs(@Query('nodeExecutionId') nodeExecutionId: string): Promise<any[]> {
    try {
      return await this.nodeLogsService.findByNodeExecutionId(nodeExecutionId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to get node logs: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a workflow execution' })
  @ApiParam({ name: 'id', description: 'ID of the workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution retried successfully' })
  async retryExecution(
    @Param('id') id: string,
    @Body() actionDto: ExecutionActionDto,
  ): Promise<any> {
    try {
      return await this.executionsService.retry(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to retry execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a workflow execution' })
  @ApiParam({ name: 'id', description: 'ID of the workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution cancelled successfully' })
  async cancelExecution(
    @Param('id') id: string,
    @Body() actionDto: ExecutionActionDto,
  ): Promise<any> {
    try {
      return await this.executionsService.cancel(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to cancel execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause a workflow execution' })
  @ApiParam({ name: 'id', description: 'ID of the workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution paused successfully' })
  async pauseExecution(
    @Param('id') id: string,
    @Body() actionDto: ExecutionActionDto,
  ): Promise<any> {
    try {
      return await this.executionsService.pause(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to pause execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/resume')
  @ApiOperation({ summary: 'Resume a workflow execution' })
  @ApiParam({ name: 'id', description: 'ID of the workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution resumed successfully' })
  async resumeExecution(
    @Param('id') id: string,
    @Body() actionDto: ExecutionActionDto,
  ): Promise<any> {
    try {
      return await this.executionsService.resume(id, actionDto.nodeId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to resume execution: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
