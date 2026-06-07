/** デモ用ロール切替（モック認証）。各ロールの見え方を1画面から確認できる。 */
import { HUMAN_ROLES, ROLE_LABELS, type Role } from '@evidence/shared';
import { useAuth } from '@/auth/AuthContext';
import { Select } from '@/components/ui/select';

export function RoleSwitcher() {
  const { user, switchRole } = useAuth();
  if (!user) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>ロール:</span>
      <Select
        className="h-8 w-40 text-xs"
        value={user.role}
        onChange={(e) => void switchRole(e.target.value as Role)}
      >
        {HUMAN_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
    </label>
  );
}
