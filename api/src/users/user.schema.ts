import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  displayName: string;

  @Prop({ enum: ['admin', 'user'], default: 'user' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
