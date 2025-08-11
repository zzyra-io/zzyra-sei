/**
 * Blockchain Services Module
 * Provides all blockchain-related services for the application
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PimlicoService } from '../pimlico.service';
import { EVMService } from './evm/EVMService';

@Module({
  imports: [ConfigModule],
  providers: [PimlicoService, EVMService],
  exports: [PimlicoService, EVMService],
})
export class BlockchainModule {}
