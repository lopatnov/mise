import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Step } from '../api/recipes';
import RecipeSteps from './RecipeSteps';

const photo = new File(['img'], 'step.png', { type: 'image/png' });

function renderSteps(steps: Step[], canEdit: boolean) {
  const onPhotoSelected = vi.fn();
  const onPhotoOpen = vi.fn();
  const view = render(
    <RecipeSteps steps={steps} canEdit={canEdit} onPhotoSelected={onPhotoSelected} onPhotoOpen={onPhotoOpen} />,
  );
  return { ...view, onPhotoSelected, onPhotoOpen };
}

const fileInput = () => screen.getByLabelText('recipe.detail.changePhoto');

describe('RecipeSteps', () => {
  it('renders nothing when the recipe has no steps', () => {
    const { container } = renderSteps([], true);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists steps by their order without reordering the array it was given', () => {
    const steps = [
      { order: 2, text: 'Boil' },
      { order: 1, text: 'Chop' },
    ];
    renderSteps(steps, false);

    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Chop', 'Boil']);
    expect(steps.map((s) => s.order)).toEqual([2, 1]);
  });

  it('offers no photo controls to someone who cannot edit the recipe', () => {
    renderSteps(
      [
        { order: 1, text: 'Chop', photoUrl: '/uploads/chop.jpg' },
        { order: 2, text: 'Boil' },
      ],
      false,
    );

    expect(screen.queryByTitle('recipe.detail.addPhoto')).not.toBeInTheDocument();
    expect(screen.queryByTitle('recipe.detail.changePhoto')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('recipe.detail.changePhoto')).not.toBeInTheDocument();
  });

  it('uploads the picked file as the photo of the step whose button was pressed', async () => {
    const { onPhotoSelected } = renderSteps(
      [
        { order: 1, text: 'Chop' },
        { order: 2, text: 'Boil' },
      ],
      true,
    );

    await userEvent.click(screen.getAllByTitle('recipe.detail.addPhoto')[1]);
    await userEvent.upload(fileInput(), photo);

    expect(onPhotoSelected).toHaveBeenCalledWith(2, photo);
  });

  it('replaces the photo of the step whose replace button was pressed', async () => {
    const { onPhotoSelected } = renderSteps([{ order: 3, text: 'Serve', photoUrl: '/uploads/serve.jpg' }], true);

    await userEvent.click(screen.getByTitle('recipe.detail.changePhoto'));
    await userEvent.upload(fileInput(), photo);

    expect(onPhotoSelected).toHaveBeenCalledWith(3, photo);
  });

  it('opens a step photo full size from a button named after the step', async () => {
    const { onPhotoOpen } = renderSteps([{ order: 1, text: 'Chop', photoUrl: '/uploads/chop.jpg' }], false);

    // The test i18n mock returns the key itself, so the step number is not part of the name here
    await userEvent.click(screen.getByRole('button', { name: 'recipe.form.step' }));

    expect(onPhotoOpen).toHaveBeenCalledWith(`${import.meta.env.VITE_API_URL ?? ''}/uploads/chop.jpg`);
  });
});
