import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getAllUsers() {
    const users = await this.userModel
      .find()
      .select('-password -otp -otpExpires -verifytoken')
      .exec();
    return users;
  }

  async getUserById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -otp -otpExpires -verifytoken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, updateData: Partial<User>) {
    delete updateData.password;
    delete updateData.otp;
    delete updateData.otpExpires;

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -otp -otpExpires -verifytoken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(id: string) {
    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }

    return { success: true, message: 'User deleted successfully' };
  }

  async searchUsers(query: string) {
    const users = await this.userModel
      .find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password -otp -otpExpires -verifytoken')
      .exec();

    return users;
  }
}
