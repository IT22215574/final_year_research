import { Module } from '@nestjs/common';
import { MlService } from './tripml.service';
import { MlController } from './tripml.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MlController],
  providers: [MlService],
  exports: [MlService],
})
export class MlModule {}
