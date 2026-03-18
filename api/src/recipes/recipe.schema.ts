import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecipeDocument = Recipe & Document;

@Schema({ timestamps: true })
export class Recipe {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({
    type: [{ name: String, amount: Number, unit: String }],
    default: [],
  })
  ingredients: { name: string; amount: number; unit: string }[];

  @Prop({
    type: [{ order: Number, text: String, photoUrl: String }],
    default: [],
  })
  steps: { order: number; text: string; photoUrl?: string }[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop({ min: 1, max: 5 })
  rating: number;

  @Prop({ min: 0 })
  prepTime: number;

  @Prop({ min: 0 })
  cookTime: number;

  @Prop({ default: 1, min: 1 })
  servings: number;

  @Prop()
  photoUrl: string;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  authorId: Types.ObjectId;
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
RecipeSchema.index({ title: 'text', tags: 'text' });
