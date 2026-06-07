/** ロール別ナビゲーション項目（要件 §11.1 画面×利用者）。 */
import type { Role } from '@evidence/shared';
import { messages } from '@/i18n/messages';

export interface NavItem {
  to: string;
  label: string;
}

export function navItemsForRole(role: Role): NavItem[] {
  const m = messages.nav;
  const dashboard: NavItem = { to: '/dashboard', label: m.dashboard };

  switch (role) {
    case 'contributor':
      return [dashboard, { to: '/submissions/new', label: m.newSubmission }];
    case 'manager':
      return [
        dashboard,
        { to: '/team', label: m.team },
        { to: '/admin/bi', label: m.bi },
        { to: '/admin/roadmap', label: m.roadmap },
        { to: '/admin/pending', label: m.pending },
        { to: '/admin/audit', label: m.audit },
      ];
    case 'office':
      return [
        dashboard,
        { to: '/admin', label: m.admin },
        { to: '/admin/bi', label: m.bi },
        { to: '/admin/roadmap', label: m.roadmap },
        { to: '/admin/pending', label: m.pending },
        { to: '/admin/audit', label: m.audit },
        { to: '/admin/export', label: m.exports },
      ];
    case 'auditor':
      return [dashboard, { to: '/admin/audit', label: m.audit }];
    case 'admin':
      return [
        dashboard,
        { to: '/admin', label: m.admin },
        { to: '/admin/bi', label: m.bi },
        { to: '/admin/roadmap', label: m.roadmap },
        { to: '/admin/pending', label: m.pending },
        { to: '/admin/audit', label: m.audit },
        { to: '/admin/export', label: m.exports },
        { to: '/admin/masters', label: m.masters },
      ];
    default:
      return [dashboard];
  }
}
