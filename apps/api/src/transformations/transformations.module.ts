import { Module } from '@nestjs/common';
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';

@Module({
  controllers: [TransformationsController],
  providers: [TransformationsService],
  exports: [TransformationsService],
})
export class TransformationsModule {}