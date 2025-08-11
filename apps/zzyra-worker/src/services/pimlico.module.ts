import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PimlicoService } from './pimlico.service';

@Module({
  imports: [ConfigModule],
  providers: [PimlicoService],
  exports: [PimlicoService],
})
export class PimlicoModule {}