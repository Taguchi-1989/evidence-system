import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RequireRole } from '@/components/RequireRole';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/routes/LoginPage';
import { DashboardPage } from '@/routes/DashboardPage';
import { SubmissionFormPage } from '@/routes/SubmissionFormPage';
import { SubmissionConfirmPage } from '@/routes/SubmissionConfirmPage';
import { SubmissionDetailPage } from '@/routes/SubmissionDetailPage';
import { TeamPage } from '@/routes/TeamPage';
import { AdminDashboardPage } from '@/routes/AdminDashboardPage';
import { BiDashboardPage } from '@/routes/BiDashboardPage';
import { RoadmapPage } from '@/routes/RoadmapPage';
import { PendingPage } from '@/routes/PendingPage';
import { AuditPage } from '@/routes/AuditPage';
import { ExportPage } from '@/routes/ExportPage';
import { ImportPage } from '@/routes/ImportPage';
import { MastersPage } from '@/routes/MastersPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/submissions/new" element={<SubmissionFormPage />} />
          <Route path="/submissions/:id/edit" element={<SubmissionFormPage />} />
          <Route path="/submissions/:id/confirm" element={<SubmissionConfirmPage />} />
          <Route path="/submissions/:id" element={<SubmissionDetailPage />} />

          {/* 上長以上（部門の閲覧・俯瞰） */}
          <Route element={<RequireRole roles={['manager', 'office', 'admin']} />}>
            <Route path="/team" element={<TeamPage />} />
            <Route path="/admin/bi" element={<BiDashboardPage />} />
            <Route path="/admin/roadmap" element={<RoadmapPage />} />
            <Route path="/admin/pending" element={<PendingPage />} />
          </Route>

          {/* 監査結果は監査者も閲覧可 */}
          <Route element={<RequireRole roles={['manager', 'office', 'auditor', 'admin']} />}>
            <Route path="/admin/audit" element={<AuditPage />} />
          </Route>

          {/* 事務局・管理者（全社管理・出力・取込） */}
          <Route element={<RequireRole roles={['office', 'admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/export" element={<ExportPage />} />
            <Route path="/admin/import" element={<ImportPage />} />
          </Route>

          {/* システム管理者のみ */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin/masters" element={<MastersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
