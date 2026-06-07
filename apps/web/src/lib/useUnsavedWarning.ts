import * as React from 'react';

/**
 * 未保存の変更があるとき、ブラウザのリロード・タブを閉じる・離脱の前に確認を促す。
 * （宣言的ルーター構成のため SPA 内遷移はブロックせず、データ消失が起きる
 *  リロード/クローズを beforeunload で警告する。）
 */
export function useUnsavedWarning(enabled: boolean): void {
  React.useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 多くのブラウザは独自文言を表示する。値の設定は互換性のため。
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);
}
