import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Opens a route to everyone. Every other route needs a valid token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
