import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import type { Model } from 'mongoose';
import { User, type UserDocument } from './user.schema';

/** Fields updateById may write — runtime counterpart of its parameter type */
const UPDATABLE_USER_FIELDS = [
  'isActive',
  'role',
  'displayName',
  'passwordHash',
  'resetToken',
  'resetTokenExpiresAt',
  'isEmailVerified',
  'emailVerificationToken',
  'emailVerificationTokenExpiresAt',
] as const satisfies readonly (keyof User)[];
type UpdatableUserField = (typeof UPDATABLE_USER_FIELDS)[number];

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

  async updateById(id: string, update: Partial<Pick<User, UpdatableUserField>>): Promise<UserDocument | null> {
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, ''> = {};
    // Walk the fixed field list, not the keys of `update`: a field name that came from a request body
    // (or an array body's stray `constructor` key) must never become a $set/$unset path.
    for (const key of UPDATABLE_USER_FIELDS) {
      if (!Object.hasOwn(update, key)) continue;
      const val = update[key];
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
