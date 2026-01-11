import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { AuthTokenGuard } from '../common/guards/auth-token.guard';

type AuthedRequest = Request & { user?: { id?: string; _id?: string } };

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthTokenGuard)
  @Get('profile')
  async getMyProfile(
    @Req() req: AuthedRequest,
    @Headers('x-client-type') clientType?: string,
  ) {
    const userId = req.user?.id || req.user?._id;
    const user = await this.userService.getUserById(userId as string);

    if (clientType?.toLowerCase() === 'mobile') {
      return { success: true, data: user };
    }

    return user;
  }

  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    return this.userService.searchUsers(query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    return this.userService.updateUser(id, updateData);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
