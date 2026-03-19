import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as nodemailer from 'nodemailer';
import { Settings, SettingsDocument } from './settings.schema';
import { Invite, InviteDocument } from './invite.schema';
import { UsersService } from '../users/users.service';
import type { UpdateSettingsDto, CreateInviteDto, UpdateUserDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    @InjectModel(Invite.name) private inviteModel: Model<InviteDocument>,
    private usersService: UsersService,
  ) {}

  // ── Setup ──────────────────────────────────────────────────

  async isSetupDone(): Promise<boolean> {
    const count = await this.usersService.countByRole('admin');
    return count > 0;
  }

  async setup(email: string, password: string, displayName?: string) {
    if (await this.isSetupDone()) {
      throw new ConflictException('Admin already exists');
    }
    const admin = await this.usersService.createAdmin(email, password, displayName);
    return { id: admin._id, email: admin.email, role: admin.role };
  }

  // ── Settings ───────────────────────────────────────────────

  async getSettings() {
    let settings = await this.settingsModel.findOne().lean();
    if (!settings) {
      const created = await this.settingsModel.create({});
      settings = created.toObject();
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const settings = await this.settingsModel.findOne();
    if (!settings) {
      const created = await this.settingsModel.create(dto);
      return created.toObject();
    }
    Object.assign(settings, dto);
    await settings.save();
    return settings.toObject();
  }

  // ── Invites ────────────────────────────────────────────────

  async createInvite(dto: CreateInviteDto, createdBy: string) {
    const token = uuidv4();
    const days = dto.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const invite = await this.inviteModel.create({
      token,
      email: dto.email,
      expiresAt,
      createdBy,
    });
    return invite;
  }

  async listInvites() {
    return this.inviteModel.find({ used: false, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean();
  }

  async deleteInvite(id: string) {
    const inv = await this.inviteModel.findByIdAndDelete(id);
    if (!inv) throw new NotFoundException('Invite not found');
  }

  async validateInvite(token: string): Promise<InviteDocument | null> {
    return this.inviteModel.findOne({ token, used: false, expiresAt: { $gt: new Date() } }).lean();
  }

  async markInviteUsed(token: string) {
    await this.inviteModel.findOneAndUpdate({ token }, { used: true });
  }

  // ── Users ──────────────────────────────────────────────────

  async listUsers() {
    return this.usersService.findAll();
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.usersService.updateById(id, dto);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') {
      const adminCount = await this.usersService.countByRole('admin');
      if (adminCount <= 1) throw new BadRequestException('Cannot delete the last admin');
    }
    await this.usersService.deleteById(id);
  }

  // ── Email ──────────────────────────────────────────────────

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const settings = await this.getSettings();
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) return false;

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort ?? 587,
      secure: (settings.smtpPort ?? 587) === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });

    await transporter.sendMail({
      from: settings.smtpFrom ?? settings.smtpUser,
      to,
      subject,
      html,
    });
    return true;
  }

  getAppUrl(): Promise<string> {
    return this.getSettings().then((s) => s.appUrl ?? 'http://localhost:5173');
  }
}
