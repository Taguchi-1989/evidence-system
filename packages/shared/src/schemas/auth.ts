/** 認証スキーマ — モック認証（開発）と将来の Cognito で共通の Identity 形 */
import { z } from 'zod';
import { RoleEnum } from '../enums.js';

/**
 * 認証済みユーザー（トークンのクレーム相当）。
 * モック/Cognito どちらのプロバイダもこの形に正規化して返す。
 */
export const AuthUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: RoleEnum,
  departmentId: z.string(),
  /** 上長が閲覧できる配下部署（自部署含む）。RBAC のスコープ計算に使用 */
  managedDepartmentIds: z.array(z.string()).default([]),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/** モックログイン要求：seed 済みユーザーIDを指定、ロールは任意で上書き */
export const MockLoginSchema = z.object({
  userId: z.string().min(1),
  /** 省略時はユーザーの既定ロール。デモで見え方を切り替えたいとき上書き */
  role: RoleEnum.optional(),
});
export type MockLoginInput = z.infer<typeof MockLoginSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
