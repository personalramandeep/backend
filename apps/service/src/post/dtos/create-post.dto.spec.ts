import { EPostVisibility } from '@app/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreatePostDto } from './create-post.dto';

describe('CreatePostDto', () => {
  it('requires sportId for post creation', () => {
    const dto = plainToInstance(CreatePostDto, {
      mediaId: 'media-1',
      visibility: EPostVisibility.PUBLIC,
    });

    const errors = validateSync(dto);
    const sportIdError = errors.find((error) => error.property === 'sportId');

    expect(sportIdError).toBeDefined();
  });
});
