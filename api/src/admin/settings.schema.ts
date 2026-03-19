import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema()
export class Settings {
  @Prop({ default: true })
  allowRegistration: boolean;

  @Prop()
  smtpHost?: string;

  @Prop()
  smtpPort?: number;

  @Prop()
  smtpUser?: string;

  @Prop()
  smtpPass?: string;

  @Prop()
  smtpFrom?: string;

  @Prop()
  appUrl?: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
