/**
 * Every date in the app is written the international way, year first: `2026-10-09 08:46`.
 * It is the default of the `date` pipe (see `app.config.ts`), so templates just write `| date`.
 */
export const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm';

/** For places that only need the day: `2026-10-09`. */
export const DATE_FORMAT = 'yyyy-MM-dd';
