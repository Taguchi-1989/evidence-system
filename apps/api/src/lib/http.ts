/** HTTP エラーと共通レスポンス整形。 */
import type { Context } from 'hono';
import { ZodError } from 'zod';
import { ERROR_CODES, type ErrorCode, type ApiError } from '@evidence/shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public details?: ApiError['error']['details'],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const unauthorized = (m = '認証が必要です') =>
  new HttpError(401, ERROR_CODES.UNAUTHORIZED, m);
export const forbidden = (m = '権限がありません') => new HttpError(403, ERROR_CODES.FORBIDDEN, m);
export const notFound = (m = '見つかりません') => new HttpError(404, ERROR_CODES.NOT_FOUND, m);
export const conflict = (m: string) => new HttpError(409, ERROR_CODES.CONFLICT, m);
export const policyBlocked = (m: string, details?: ApiError['error']['details']) =>
  new HttpError(422, ERROR_CODES.POLICY_BLOCKED, m, details);
export const tooManyRequests = (m = 'リクエストが多すぎます') =>
  new HttpError(429, ERROR_CODES.RATE_LIMITED, m);
export const badRequest = (m: string, details?: ApiError['error']['details']) =>
  new HttpError(400, ERROR_CODES.VALIDATION, m, details);

/** Zod のエラーを VALIDATION HttpError に変換 */
export function fromZod(e: ZodError): HttpError {
  const details = e.errors.map((iss) => ({ path: iss.path.join('.'), message: iss.message }));
  return new HttpError(400, ERROR_CODES.VALIDATION, '入力内容を確認してください', details);
}

export function errorBody(e: HttpError): ApiError {
  return { error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) } };
}

/** Zod schema で body をパースし、失敗時は VALIDATION エラーを投げる */
export async function parseBody<T>(c: Context, schema: { parse: (v: unknown) => T }): Promise<T> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    raw = {};
  }
  try {
    return schema.parse(raw);
  } catch (e) {
    if (e instanceof ZodError) throw fromZod(e);
    throw e;
  }
}
