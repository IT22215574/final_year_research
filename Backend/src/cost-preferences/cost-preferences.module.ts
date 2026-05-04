import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CostPreference,
  CostPreferenceSchema,
} from '../schemas/cost-preference.schema';
import { CostPreferencesController } from './cost-preferences.controller';
import { CostPreferencesService } from './cost-preferences.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CostPreference.name, schema: CostPreferenceSchema },
    ]),
    AuthModule,
  ],
  controllers: [CostPreferencesController],
  providers: [CostPreferencesService],
  exports: [CostPreferencesService],
})
export class CostPreferencesModule {}
