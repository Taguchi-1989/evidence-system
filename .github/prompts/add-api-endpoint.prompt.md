---
mode: agent
description: RBAC 付きの新規 API エンドポイントを追加する
---

新しい API エンドポイント「{{メソッド・パス・目的}}」を追加してください。

1. 入出力の型は `packages/shared` に Zod で定義（フロント/バック共有）。
2. ルートは該当の `apps/api/src/handlers/*.ts`（無ければ新規）に追加し、`app.ts` に mount。
   - 認証は `requireAuth`、権限は `requireRole(...)` か `services/rbac.ts` の関数で必ずガード。
   - 入力は `parseBody(c, Schema)`、エラーは `lib/http.ts` のヘルパー（notFound/forbidden 等）。
   - 変更系は `services/activity.ts` の `logActivity` で操作ログを記録。
3. DynamoDB を使うなら `db/keys.ts` にキーを足し、`repositories/*` 経由で読み書き（生キー直書き禁止）。
4. フロントから使うなら `apps/web/src/lib/endpoints.ts` に型付き関数を追加。
5. 外部Agentが使う場合は `docs/api.md` の一覧にも追記。

最後に `pnpm verify` が緑になるまで修正し、可能なら `verify-local.ts` にアサーションを追加してください。
