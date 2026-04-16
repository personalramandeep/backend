import { SetMetadata } from '@nestjs/common';

export const IS_INTERNAL_KEY = 'is_internal';

export const Internal = () => SetMetadata(IS_INTERNAL_KEY, true);
