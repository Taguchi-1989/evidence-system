/** 共通エラーハンドラ：HttpError/ZodError を ApiError JSON に整形。 */
import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@evidence/shared';
import { HttpError, errorBody, fromZod } from '../lib/http.js';

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HttpError) {
    return c.json(errorBody(err), err.status as 400);
  }
  if (err instanceof ZodError) {
    const he = fromZod(err);
    return c.json(errorBody(he), he.status as 400);
  }
  const requestId = c.get('requestId' as never) ?? '';
  console.error(`[unhandled] requestId=${requestId}`, err);
  return c.json(
    {
      error: {
        code: ERROR_CODES.INTERNAL,
        message: `サーバ内部エラーが発生しました（requestId: ${requestId}）`,
      },
    },
    500,
  );
};
