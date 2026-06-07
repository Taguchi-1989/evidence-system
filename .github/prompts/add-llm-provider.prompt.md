---
mode: agent
description: 監査の LLM プロバイダを追加する（例: AWS Bedrock / OpenAI 互換）
---

監査の LLM プロバイダ「{{プロバイダ名}}」を追加してください。既存の none/anthropic/azure-openai と同じ構造に揃えます。

1. `apps/api/src/config.ts` の `audit` に必要な設定（エンドポイント/キー/モデル等）を追加し、`.env.example` にも追記。
2. `apps/api/src/audit/llm.ts`
   - `llmEnabled()` に新プロバイダの有効条件を追加。
   - `llmModelName()` に表示名を追加。
   - `call{{プロバイダ}}(prompt)` を実装し、`scoreWithLLM` の分岐に追加。
   - 出力は既存の `LlmScore`(JSON) にパースする。失敗時 null（構造チェックのみで動作継続）。
3. プロバイダは参考判定のみ（評価確定にしない）方針を維持。

最後に `pnpm verify` が緑になるまで修正してください（プロバイダ未設定でも既存テストが通ること）。
