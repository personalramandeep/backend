import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/**
 * Mark a controller or route handler as publicly accessible.
 * Routes decorated with @Public() bypass the global AuthGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
