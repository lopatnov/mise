import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddCookNoteDto } from './recipe.dto';

describe('AddCookNoteDto', () => {
  it('accepts a valid note', async () => {
    const dto = plainToInstance(AddCookNoteDto, { text: 'Add more garlic', rating: 4 });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts a note with no rating', async () => {
    const dto = plainToInstance(AddCookNoteDto, { text: 'Add more garlic' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects blank text', async () => {
    const dto = plainToInstance(AddCookNoteDto, { text: '' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects whitespace-only text', async () => {
    const dto = plainToInstance(AddCookNoteDto, { text: '   \n\t  ' });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects a fractional rating', async () => {
    const dto = plainToInstance(AddCookNoteDto, { text: 'Good', rating: 4.5 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects a rating outside 1-5', async () => {
    const dto = plainToInstance(AddCookNoteDto, { text: 'Good', rating: 6 });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
