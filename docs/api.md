# API リファレンス（外部Agent / 他システム連携）

成果・証跡管理システムの REST API。他の Agent ソフトや外部システムから利用できます。
型は [`@evidence/shared`](../packages/shared/src) の Zod スキーマが単一の真実源です。

- ベースURL（ローカル）: `http://localhost:8787`
- 本番: API Gateway の出力 URL（`pnpm deploy:aws` の `ApiUrl`）
- リクエスト/レスポンス: `application/json`（UTF-8）
- エラー形式: `{ "error": { "code": string, "message": string, "details"?: [{path,message}] } }`

---

## 認証

`Authorization: Bearer <token>` を付与します。2 通り：

### 1) 外部Agent / システム連携（APIキー）★推奨（M2M）
`.env` の `AGENT_API_KEYS`（カンマ区切り）に登録したキーをそのまま Bearer に使います。
一致するとサービスIDで認証されます。付与ロールは `AGENT_API_ROLE`（**既定 `auditor`＝read系のみ**の
セキュアデフォルト）。export/監査実行/取込/承認まで許可するなら `office`、全権は `admin`。
キーは `timingSafeEqual` で照合します。

```bash
curl -H "Authorization: Bearer $AGENT_API_KEY" \
  "http://localhost:8787/submissions?scope=all&fiscalYear=2026"
```

> 付与ロールは `AGENT_API_ROLE` で変更可（`office`=全社read+export / `auditor`=監査read+監査write 等）。
> キーは安全に管理し、本番では Secrets Manager 等に保管してください。

### 2) 利用者ログイン（モック / 本番 Cognito）
開発はモックトークン。本番は `AUTH_PROVIDER=cognito` で JWT。

```bash
TOKEN=$(curl -s -X POST http://localhost:8787/auth/login \
  -H 'content-type: application/json' -d '{"userId":"user-005"}' | jq -r .token)
```

### ロールと主な権限（§13）
| ロール | 権限の要点 |
| --- | --- |
| contributor | 自分の提出の作成/編集/提出 |
| manager | 自部署＋配下の閲覧・承認・差戻し |
| office | 全社read・集計・エクスポート・監査実行 |
| auditor | 全社read・監査結果read |
| admin | マスタ/ポリシー設定・全操作 |

---

## エンドポイント一覧

### 認証
| Method | Path | 認証 | 説明 |
| --- | --- | --- | --- |
| POST | `/auth/login` | 不要 | モックログイン `{userId, role?}` → `{token, user}` |
| GET | `/auth/me` | 要 | 現在のユーザー |
| GET | `/health` | 不要 | ヘルスチェック |

### 設定・マスタ
| Method | Path | 認証/ロール | 説明 |
| --- | --- | --- | --- |
| GET | `/config/policy?fiscalYear=` | 要 | 有効ポリシー `{fiscalYear, mode, policy}` |
| GET | `/masters?fiscalYear=` | 要 | 部署＋固定選択肢 |
| PUT | `/admin/config/policy` | admin | 運用モード/ポリシー更新 |
| PUT | `/admin/masters/department` | admin | 部署 upsert |

### 提出（Submission）
| Method | Path | 認証/ロール | 説明 |
| --- | --- | --- | --- |
| GET | `/submissions?scope=me\|department\|all&fiscalYear=&status=` | 要 | 一覧（ロールで絞込） |
| POST | `/submissions` | 要 | 作成（下書き）`CreateSubmissionInput` |
| GET | `/submissions/:id` | 要 | 1件取得 |
| PUT | `/submissions/:id` | 本人 | 下書き更新 |
| POST | `/submissions/:id/submit` | 本人 | 提出（モード連動の必須チェック） |
| POST | `/submissions/:id/approve` | reviewer | 承認 `{comment}` |
| POST | `/submissions/:id/reject` | reviewer | 差戻し `{comment}` |
| POST | `/submissions/:id/comment` | reviewer | コメント `{comment}` |

### 証跡（Evidence・presigned URL）
| Method | Path | 説明 |
| --- | --- | --- |
| POST | `/submissions/:id/evidence/presign` | アップロードURL発行 `PresignUploadInput` → `{evidenceId, uploadUrl, s3Key}` |
| POST | `/submissions/:id/evidence/confirm` | アップロード確定 `{evidenceId}` |
| GET | `/submissions/:id/evidence` | 証跡一覧 |
| GET | `/submissions/:id/evidence/:eid/download` | ダウンロードURL `{url}` |
| DELETE | `/submissions/:id/evidence/:eid` | 論理削除 |

### 監査Agent
| Method | Path | ロール | 説明 |
| --- | --- | --- | --- |
| POST | `/admin/audit/run` | office/admin | 監査実行 `{fiscalYear, submissionId?}` → サマリー（**レート制限あり**：`AUDIT_RUN_RATE_PER_MIN`/分/ユーザー、超過は 429 + Retry-After） |
| GET | `/admin/audit?fiscalYear=` | office/auditor/admin/manager | 年度の監査結果 |
| GET | `/submissions/:id/audit` | 要 | 提出単位の監査結果（表示ポリシー依存） |

### 集計・ログ・要確認
| Method | Path | ロール |
| --- | --- | --- |
| GET | `/admin/stats?fiscalYear=` | office/auditor/admin |
| GET | `/admin/logs?fiscalYear=` | office/admin |
| GET | `/admin/pending?fiscalYear=` | office/admin/manager |

### エクスポート（§16）
| Method | Path | ロール | 説明 |
| --- | --- | --- | --- |
| POST | `/admin/export` | office/admin | 作成 `{fiscalYear, format:"json"\|"csv"}` |
| GET | `/admin/exports?fiscalYear=` | office/admin | ジョブ一覧 |
| GET | `/admin/export/:id` | office/admin | ジョブ取得 |
| GET | `/admin/export/:id/download` | office/admin | ダウンロードURL `{url}` |

---

## 外部Agentからの典型フロー

```bash
KEY=$AGENT_API_KEY ; B=http://localhost:8787
# 1) 年度の提出を取得
curl -s -H "Authorization: Bearer $KEY" "$B/submissions?scope=all&fiscalYear=2026"
# 2) 監査Agentを実行（証跡の一次チェック）
curl -s -X POST -H "Authorization: Bearer $KEY" -H 'content-type: application/json' \
  "$B/admin/audit/run" -d '{"fiscalYear":"2026"}'
# 3) JSON エクスポート（schemaVersion 1.0）→ ダウンロードURL
JID=$(curl -s -X POST -H "Authorization: Bearer $KEY" -H 'content-type: application/json' \
  "$B/admin/export" -d '{"fiscalYear":"2026","format":"json"}' | jq -r .exportJobId)
URL=$(curl -s -H "Authorization: Bearer $KEY" "$B/admin/export/$JID/download" | jq -r .url)
curl -s "$URL" -o export.json   # 他システム/BIへ取り込み
```

## JSON エクスポート構造（schemaVersion 1.0, §16.2）
[`packages/shared/src/export-format.ts`](../packages/shared/src/export-format.ts) が定義。
`{ schemaVersion, exportedAt, fiscalYear, submissions[] }`。各 submission は
`impact / contribution / evidenceStatus / evidenceFiles[] / auditResults[] / status` を含み、
**証跡メタと監査結果まで** 1ファイルに揃うため、外部 BI / DWH へそのまま投入できます。

## 監査の LLM プロバイダ（任意）
`AUDIT_LLM_PROVIDER` で切替：`none`（構造チェックのみ）/ `anthropic` / `azure-openai`。
Azure OpenAI は `AZURE_OPENAI_ENDPOINT / _API_KEY / _DEPLOYMENT / _API_VERSION` を設定。
未設定でも監査は構造チェック（読取可否・タイプ整合）で動作します。

## 証跡のテキスト抽出
CSV/テキストと **XLSX** はサーバ側でテキスト抽出し、監査の関連度判定に利用します
（PDF/PPTX/画像は読取可・バイナリ扱い。Textract 等で拡張可能）。

> 将来：AIエージェント向けに MCP サーバ化も可能（本 REST API をツールとして公開）。要望に応じて追加します。
