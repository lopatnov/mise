import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type InviteDocument = Invite & Document;

@Schema({ timestamps: true })
export class Invite {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ required: true })
  createdBy: string;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
