import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import type { Model } from 'mongoose';
import { User, type UserDocument } from './user.schema';

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

  async countActiveByRole(role: string): Promise<number> {
    return this.userModel.countDocuments({ role, isActive: true });
  }

  async create(email: string, password: string, displayName?: string): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
    });
    return user.save();
  }

  async createAdmin(email: string, password: string, displayName?: string): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      role: 'admin',
    });
    return user.save();
  }

  async findByEmailVerificationToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ emailVerificationToken: String(token), emailVerificationTokenExpiresAt: { $gt: new Date() } })
      .lean();
  }

  async updateById(
    id: string,
    update: Partial<
      Pick<
        User,
        | 'isActive'
        | 'role'
        | 'displayName'
        | 'passwordHash'
        | 'resetToken'
        | 'resetTokenExpiresAt'
        | 'isEmailVerified'
        | 'emailVerificationToken'
        | 'emailVerificationTokenExpiresAt'
      >
    >,
  ): Promise<UserDocument | null> {
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ''> = {};
    for (const [key, val] of Object.entries(update)) {
      if (val === undefined) $unset[key] = '';
      else $set[key] = val;
    }
    const op: Record<string, unknown> = {};
    if (Object.keys($set).length) op.$set = $set;
    if (Object.keys($unset).length) op.$unset = $unset;
    return this.userModel.findByIdAndUpdate(id, op, { new: true }).lean();
  }

  async deleteById(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id);
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ resetToken: String(token), resetTokenExpiresAt: { $gt: new Date() } }).lean();
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
