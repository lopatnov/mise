import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).lean();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-passwordHash -resetToken').sort({ createdAt: -1 }).lean();
  }

  async countByRole(role: string): Promise<number> {
    return this.userModel.countDocuments({ role });
  }

  async create(email: string, password: string, displayName?: string): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new this.userModel({ email: email.toLowerCase(), passwordHash, displayName });
    return user.save();
  }

  async createAdmin(email: string, password: string, displayName?: string): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new this.userModel({ email: email.toLowerCase(), passwordHash, displayName, role: 'admin' });
    return user.save();
  }

  async updateById(
    id: string,
    update: Partial<Pick<User, 'isActive' | 'role' | 'displayName' | 'passwordHash' | 'resetToken' | 'resetTokenExpiresAt'>>,
  ): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).lean();
  }

  async deleteById(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id);
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ resetToken: token, resetTokenExpiresAt: { $gt: new Date() } })
      .lean();
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
