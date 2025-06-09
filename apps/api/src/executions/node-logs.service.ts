import { Injectable } from '@nestjs/common';
import { NodeLogDto } from './dto/execution.dto';

@Injectable()
export class NodeLogsService {
  // This is a placeholder implementation
  // In a real application, you would connect to your database here
  private readonly mockNodeLogs: NodeLogDto[] = [
    {
      id: 'log-1',
      node_execution_id: 'node-exec-1',
      message: 'Starting node execution',
      level: 'info',
      created_at: new Date().toISOString(),
    },
    {
      id: 'log-2',
      node_execution_id: 'node-exec-1',
      message: 'Processing data',
      level: 'debug',
      created_at: new Date().toISOString(),
    },
    {
      id: 'log-3',
      node_execution_id: 'node-exec-1',
      message: 'Node execution completed successfully',
      level: 'info',
      created_at: new Date().toISOString(),
    },
    {
      id: 'log-4',
      node_execution_id: 'node-exec-4',
      message: 'Starting node execution',
      level: 'info',
      created_at: new Date().toISOString(),
    },
    {
      id: 'log-5',
      node_execution_id: 'node-exec-4',
      message: 'Encountered an error during processing',
      level: 'error',
      created_at: new Date().toISOString(),
    },
  ];

  async findByNodeExecutionId(nodeExecutionId: string): Promise<NodeLogDto[]> {
    return this.mockNodeLogs.filter(
      (log) => log.node_execution_id === nodeExecutionId,
    );
  }
}
