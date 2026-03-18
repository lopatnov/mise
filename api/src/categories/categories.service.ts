import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './category.schema';

const DEFAULT_CATEGORIES = [
  { name: 'Завтрак', icon: '🍳' },
  { name: 'Обед', icon: '🍲' },
  { name: 'Ужин', icon: '🍽️' },
  { name: 'Десерт', icon: '🍰' },
  { name: 'Напиток', icon: '☕' },
  { name: 'Закуска', icon: '🥗' },
  { name: 'Выпечка', icon: '🥐' },
  { name: 'Суп', icon: '🍜' },
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private model: Model<CategoryDocument>,
  ) {}

  async seed() {
    const count = await this.model.countDocuments();
    if (count === 0) {
      await this.model.insertMany(DEFAULT_CATEGORIES);
    }
  }

  findAll() {
    return this.model.find().lean();
  }

  create(name: string, icon?: string) {
    return this.model.create({ name, icon });
  }
}
