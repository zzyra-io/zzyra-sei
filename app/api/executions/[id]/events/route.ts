import { NextResponse } from 'next/server';
import { ExecutionEventsService } from '@/lib/services/execution-events.service';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id: executionId } = params;
  const stream = new ReadableStream({
    start(controller) {
      const listener = (event: any) => {
        if (event.executionId === executionId) {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        }
      };
      ExecutionEventsService.on('nodeUpdate', listener);
      controller.enqueue(': connected\n\n');
      // Clean up on close
      stream.closed.then(() => ExecutionEventsService.off('nodeUpdate', listener));
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
