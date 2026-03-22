import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema()
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  icon: string;

  @Prop({ sparse: true })
  slug?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
