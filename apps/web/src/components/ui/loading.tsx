/** レイアウトを保ったまま表示する共通ローディング表示（チラつき防止 + a11y）。 */
import { messages } from '@/i18n/messages';
import { cn } from '@/lib/utils';

export function Loading({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span>{label ?? messages.common.loading}</span>
    </div>
  );
}
