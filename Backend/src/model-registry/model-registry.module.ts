import { Module } from '@nestjs/common';
import { ModelRegistryService } from './model-registry.service';
import { ModelRegistryController } from './model-registry.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ModelVersion, ModelVersionSchema } from '../schemas/model-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModelVersion.name, schema: ModelVersionSchema }
    ])
  ],
  controllers: [ModelRegistryController],
  providers: [ModelRegistryService],
  exports: [ModelRegistryService],
})
export class ModelRegistryModule { }
