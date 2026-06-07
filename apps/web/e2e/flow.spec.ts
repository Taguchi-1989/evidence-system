import { test, expect } from '@playwright/test';

/** ログインヘルパー：ログイン画面で利用者を選ぶ */
async function loginAs(page: import('@playwright/test').Page, buttonName: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: buttonName }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test('一般入力者：達成入力→下書き保存→確認→提出 の通し', async ({ page }) => {
  await loginAs(page, '佐藤 花子 一般入力者');

  // 新規作成（ナビゲーションのリンクから）
  await page.getByRole('navigation').getByRole('link', { name: '達成内容を入力' }).click();
  await expect(page).toHaveURL(/\/submissions\/new/);

  await page.getByLabel('テーマ名').fill('e2e 自動テストの整備');
  await page.getByLabel('達成内容').fill('Playwright による通しテストを整備し、回帰を自動化した。');

  // 影響度・貢献度（ネイティブ select）
  await page.getByLabel('影響度（自己評価）').selectOption('3');
  await page.getByLabel('貢献度（自己評価）').selectOption('4');

  // 下書き保存 → 編集画面へ遷移
  await page.getByRole('button', { name: '下書き保存' }).click();
  await expect(page).toHaveURL(/\/submissions\/.+\/edit/);

  // 確認画面へ
  await page.getByRole('button', { name: '提出内容を確認' }).click();
  await expect(page).toHaveURL(/\/submissions\/.+\/confirm/);
  await expect(page.getByText('e2e 自動テストの整備')).toBeVisible();

  // 提出
  await page.getByRole('button', { name: '提出する' }).click();
  await expect(page).toHaveURL(/\/submissions\/[^/]+$/);
  await expect(page.getByText('提出済み')).toBeVisible();
});

test('事務局：管理ダッシュボードで集計が見える', async ({ page }) => {
  await loginAs(page, '事務局 担当 事務局');
  await page.getByRole('link', { name: '管理ダッシュボード' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('提出総数')).toBeVisible();
  await expect(page.getByText('部署別提出状況')).toBeVisible();
});

test('事務局：監査Agentを実行できる', async ({ page }) => {
  await loginAs(page, '事務局 担当 事務局');
  await page.getByRole('link', { name: '監査結果' }).click();
  await expect(page).toHaveURL(/\/admin\/audit/);
  await page.getByRole('button', { name: '監査Agentを実行' }).click();
  // 実行後、結果テーブルに判定が表示される
  await expect(page.getByText(/参考資料あり|要確認|機密のため未添付|証跡なし/).first()).toBeVisible();
});
