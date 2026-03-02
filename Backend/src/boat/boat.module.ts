import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Boat, BoatSchema } from '../schemas/boat.schema';
import { BoatService } from './boat.service';
import { BoatController } from './boat.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Boat.name, schema: BoatSchema }]),
    AuthModule, // ✅ this makes JwtService available for AuthTokenGuard
  ],
  controllers: [BoatController],
  providers: [BoatService],
  exports: [BoatService], // important for cost-engine
})
export class BoatModule {}
