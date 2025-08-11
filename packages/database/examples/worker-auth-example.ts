/**
 * Worker Authentication Example
 * 
 * This example demonstrates how to use the authentication system in a worker process.
 */

import { 
  JwtService, 
  PolicyService, 
  ExecutionRepository,
  WorkflowRepository,
  PolicyContext
} from '@zzyra/database';
import { ExecutionStatus } from '@zzyra/types';

// Initialize services
const jwtService = new JwtService();
const policyService = new PolicyService();
const executionRepository = new ExecutionRepository();
const workflowRepository = new WorkflowRepository();

/**
 * Example function to process a workflow execution with authentication
 */
export async function processExecution(executionId: string, token: string) {
  try {
    // Verify the token
    const payload = await jwtService.verifyToken(token);
    if (!payload) {
      throw new Error('Invalid token');
    }

    const userId = payload.sub;
    
    // Create policy context
    const policyContext: PolicyContext = {
      userId,
      isAdmin: payload.isAdmin || false,
      teamIds: payload.teamIds || [],
    };

    // Get the execution with policy enforcement
    const execution = await executionRepository.findById(executionId, userId);
    if (!execution) {
      throw new Error('Execution not found or access denied');
    }

    // Check access to the workflow
    const workflowId = execution.workflowId;
    const hasWorkflowAccess = await policyService.checkWorkflowAccess(workflowId, policyContext);
    if (!hasWorkflowAccess) {
      throw new Error('Access to workflow denied');
    }

    // Process the execution
    // ... execution logic here ...

    // Update execution status
    await executionRepository.update(
      executionId,
      { status: 'completed' }, // Using string literal instead of enum value
      userId
    );

    return { success: true, executionId };
  } catch (error: any) {
    console.error('Error processing execution:', error);
    
    // Update execution status to failed if we have the executionId
    if (error.executionId) {
      try {
        await executionRepository.update(
          error.executionId,
          { 
            status: 'failed', // Using string literal instead of enum value
            error: error.message
          },
          'system' // Use system user for error updates
        );
      } catch (updateError) {
        console.error('Failed to update execution status:', updateError);
      }
    }
    
    throw error;
  }
}

/**
 * Example function to verify a system token for inter-service communication
 */
export async function verifySystemToken(token: string) {
  try {
    const payload = await jwtService.verifyToken(token);
    if (!payload || payload.type !== 'system') {
      throw new Error('Invalid system token');
    }
    
    return { valid: true, payload };
  } catch (error) {
    console.error('System token verification error:', error);
    return { valid: false, error };
  }
}

/**
 * Example function to handle webhook execution with minimal authentication
 */
export async function handleWebhook(workflowId: string, webhookToken: string, data: any) {
  try {
    // Verify the webhook token (this would be a simplified token just for webhooks)
    const isValidToken = await verifyWebhookToken(workflowId, webhookToken);
    if (!isValidToken) {
      throw new Error('Invalid webhook token');
    }
    
    // Get the workflow
    const workflow = await workflowRepository.findById(workflowId, 'system');
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    // Create an execution for the webhook
    const execution = await executionRepository.create({
      workflowId,
      status: 'running', // Using string literal instead of enum value
      input: data,
      output: null,
      startedAt: new Date(),
      completedAt: null,
      error: null,
    }, 'system');
    
    // Process the execution
    // ... webhook execution logic here ...
    
    return { success: true, executionId: execution.id };
  } catch (error: any) {
    console.error('Webhook error:', error);
    throw error;
  }
}

/**
 * Helper function to verify a webhook token
 */
async function verifyWebhookToken(workflowId: string, token: string): Promise<boolean> {
  // In a real implementation, this would verify against a stored token
  // For this example, we're just doing a simple check
  return token === `webhook-${workflowId}-token`;
}
