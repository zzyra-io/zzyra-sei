/**
 * Blockchain Services Module
 * Provides all blockchain-related services for the application
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { PimlicoService } from '../pimlico.service';
import { EVMService } from './evm/EVMService';

@Module({
  imports: [ConfigModule],
  providers: [EVMService],
  exports: [EVMService],
})
export class BlockchainModule {}
