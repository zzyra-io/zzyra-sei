import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZeroDevService } from './zerodev.service';

@Module({
  imports: [ConfigModule],
  providers: [ZeroDevService],
  exports: [ZeroDevService],
})
export class ZeroDevModule {}
