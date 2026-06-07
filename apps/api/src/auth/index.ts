/** 設定に応じて AuthProvider を選択するファクトリ。 */
import { config } from '../config.js';
import type { AuthProvider } from './provider.js';
import { MockAuthProvider } from './mock.js';
import { CognitoAuthProvider } from './cognito.js';

let instance: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (instance) return instance;
  instance = config.auth.provider === 'cognito' ? new CognitoAuthProvider() : new MockAuthProvider();
  return instance;
}

export * from './provider.js';
export { encodeMockToken } from './mock.js';
