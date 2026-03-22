import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Category, type CategoryDocument } from './category.schema';

const DEFAULT_CATEGORIES = [
  { name: 'Breakfast', slug: 'breakfast', icon: '🍳' },
  { name: 'Lunch', slug: 'lunch', icon: '🍲' },
  { name: 'Dinner', slug: 'dinner', icon: '🍽️' },
  { name: 'Dessert', slug: 'dessert', icon: '🍰' },
  { name: 'Drink', slug: 'drink', icon: '☕' },
  { name: 'Snack', slug: 'snack', icon: '🥗' },
  { name: 'Bakery', slug: 'bakery', icon: '🥐' },
  { name: 'Soup', slug: 'soup', icon: '🍜' },
];

// Adds slugs to categories seeded before slug field was introduced
const SLUG_MIGRATIONS: { name: string; slug: string }[] = [
  { name: 'Завтрак', slug: 'breakfast' },
  { name: 'Обед', slug: 'lunch' },
  { name: 'Ужин', slug: 'dinner' },
  { name: 'Десерт', slug: 'dessert' },
  { name: 'Напиток', slug: 'drink' },
  { name: 'Закуска', slug: 'snack' },
  { name: 'Выпечка', slug: 'bakery' },
  { name: 'Суп', slug: 'soup' },
];

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private model: Model<CategoryDocument>) {}

  async seed() {
    for (const m of SLUG_MIGRATIONS) {
      await this.model.updateOne({ name: m.name, slug: { $exists: false } }, { $set: { slug: m.slug } });
    }
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
