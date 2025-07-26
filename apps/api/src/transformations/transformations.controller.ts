import { Controller, Post, Body } from '@nestjs/common';
import { TransformationsService } from './transformations.service';

@Controller('transformations')
export class TransformationsController {
  constructor(private readonly transformationsService: TransformationsService) {}

  @Post('preview')
  async previewTransformations(@Body() body: {
    data: any;
    transformations: any[];
  }) {
    return this.transformationsService.previewTransformations(
      body.data,
      body.transformations
    );
  }

  @Post('validate')
  async validateTransformations(@Body() body: {
    transformations: any[];
  }) {
    return this.transformationsService.validateTransformations(body.transformations);
  }

  @Post('infer-schema')
  async inferSchema(@Body() body: {
    data: any;
    samples?: any[];
  }) {
    return this.transformationsService.inferSchema(body.data, body.samples);
  }

  @Post('analyze-compatibility')
  async analyzeCompatibility(@Body() body: {
    sourceSchema: any;
    targetSchema: any;
  }) {
    return this.transformationsService.analyzeCompatibility(
      body.sourceSchema,
      body.targetSchema
    );
  }
}