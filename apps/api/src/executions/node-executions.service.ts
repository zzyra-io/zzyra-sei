import { Injectable } from '@nestjs/common';
import { NodeExecutionDto } from './dto/execution.dto';

@Injectable()
export class NodeExecutionsService {
  // This is a placeholder implementation
  // In a real application, you would connect to your database here
  private readonly mockNodeExecutions: NodeExecutionDto[] = [
    {
      id: 'node-exec-1',
      execution_id: '1',
      node_id: 'node-1',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      input_data: { input: 'value' },
      output_data: { output: 'result' },
    },
    {
      id: 'node-exec-2',
      execution_id: '1',
      node_id: 'node-2',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      input_data: { input: 'from-node-1' },
      output_data: { output: 'final-result' },
    },
    {
      id: 'node-exec-3',
      execution_id: '2',
      node_id: 'node-1',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      input_data: { input: 'value' },
      output_data: { output: 'result' },
    },
    {
      id: 'node-exec-4',
      execution_id: '2',
      node_id: 'node-2',
      status: 'failed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      input_data: { input: 'from-node-1' },
      error: 'Node execution failed',
    },
  ];

  async findByExecutionId(executionId: string): Promise<NodeExecutionDto[]> {
    return this.mockNodeExecutions.filter(
      (nodeExecution) => nodeExecution.execution_id === executionId,
    );
  }

  async findById(id: string): Promise<NodeExecutionDto | undefined> {
    return this.mockNodeExecutions.find((nodeExecution) => nodeExecution.id === id);
  }
}
