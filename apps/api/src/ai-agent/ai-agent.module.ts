import { Module } from '@nestjs/common'
import { AIAgentController } from './ai-agent.controller'
import { AIAgentService } from './ai-agent.service'

@Module({
  controllers: [AIAgentController],
  providers: [AIAgentService],
  exports: [AIAgentService]
})
export class AIAgentModule {}