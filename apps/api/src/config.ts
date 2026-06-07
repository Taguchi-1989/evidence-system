/** 環境設定の読み込みと型付きアクセス。ローカル/AWS の差はここに集約する。 */
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** カレントから上方向に .env を探索（モノレポ root の .env を拾う） */
function findEnvFile(start: string): string | undefined {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const here = dirname(fileURLToPath(import.meta.url));
const envPath = findEnvFile(here);
if (envPath) loadEnv({ path: envPath });

function env(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}
function optionalEnv(key: string): string | undefined {
  const v = process.env[key];
  return v === undefined || v === '' ? undefined : v;
}

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  isProd: process.env.NODE_ENV === 'production',

  aws: {
    region: env('AWS_REGION', 'ap-northeast-1'),
    /** ローカルは LocalStack。本番は undefined（AWS 実エンドポイント） */
    endpoint: optionalEnv('AWS_ENDPOINT_URL'),
    accessKeyId: optionalEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: optionalEnv('AWS_SECRET_ACCESS_KEY'),
  },

  /**
   * ストレージ駆動方式:
   *   'aws'   … DynamoDB + S3（LocalStack もこれ。Docker 必要）
   *   'local' … ファイル/メモリ + ローカルFS（Docker 不要の最小モード）
   */
  storage: {
    driver: env('STORAGE_DRIVER', 'aws') as 'aws' | 'local',
    /** local モードのデータ保存先 */
    localDir: env('LOCAL_DATA_DIR', '.localdata'),
  },

  ddb: {
    tableName: env('DDB_TABLE_NAME', 'evidence-system'),
  },

  s3: {
    bucket: env('S3_BUCKET', 'evidence-bucket'),
    presignExpires: Number(env('S3_PRESIGN_EXPIRES', '300')),
    forcePathStyle: env('S3_FORCE_PATH_STYLE', 'true') === 'true',
    /** presigned URL のホスト（ブラウザから到達できる S3 公開エンドポイント） */
    publicEndpoint: optionalEnv('S3_PUBLIC_ENDPOINT'),
  },

  auth: {
    provider: env('AUTH_PROVIDER', 'mock') as 'mock' | 'cognito',
    cognito: {
      userPoolId: optionalEnv('COGNITO_USER_POOL_ID'),
      clientId: optionalEnv('COGNITO_CLIENT_ID'),
      region: optionalEnv('COGNITO_REGION'),
    },
  },

  api: {
    port: Number(env('API_PORT', '8787')),
    corsOrigin: env('CORS_ORIGIN', 'http://localhost:5173'),
  },

  audit: {
    llmProvider: env('AUDIT_LLM_PROVIDER', 'none') as
      | 'none'
      | 'anthropic'
      | 'azure-openai'
      | 'bedrock',
    anthropicApiKey: optionalEnv('ANTHROPIC_API_KEY'),
    azure: {
      endpoint: optionalEnv('AZURE_OPENAI_ENDPOINT'), // 例: https://xxx.openai.azure.com
      apiKey: optionalEnv('AZURE_OPENAI_API_KEY'),
      deployment: optionalEnv('AZURE_OPENAI_DEPLOYMENT'), // デプロイ名
      apiVersion: env('AZURE_OPENAI_API_VERSION', '2024-08-01-preview'),
    },
    /** 監査実行のレート制限（1分あたり・ユーザー単位）。LLMコスト暴走の抑止 */
    runRatePerMin: Number(env('AUDIT_RUN_RATE_PER_MIN', '5')),
  },

  /** 外部Agentソフト等からの API 連携 */
  integration: {
    /** サービス認証用 APIキー（カンマ区切り）。Bearer に一致すればサービスIDで認証 */
    agentApiKeys: (optionalEnv('AGENT_API_KEYS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    /**
     * APIキー認証時に付与するロール。
     * 既定 'auditor'＝read系のみ（セキュアデフォルト）。
     * export/監査実行/取込/承認などの write/特権操作は明示的に 'office' / 'admin' を設定。
     */
    agentApiRole: env('AGENT_API_ROLE', 'auditor'),
  },
} as const;

export type AppConfig = typeof config;
