import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getUserById(id: string) {
    const user = await this.userModel.findById(id).select('-password -verifytoken').lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getAllUsers() {
    return this.userModel.find().select('-password -verifytoken').lean();
  }

  async searchUsers(query: string) {
    if (!query) return this.getAllUsers();
    return this.userModel
      .find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password -verifytoken')
      .lean();
  }

  async updateUser(id: string, updateData: any) {
    // Prevent password update via this method
    delete updateData.password;
    delete updateData.verifytoken;

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .select('-password -verifytoken')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { success: true, message: 'User deleted successfully' };
  }
}
