import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
          <Route path="/team" element={<TeamPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/bi" element={<BiDashboardPage />} />
          <Route path="/admin/roadmap" element={<RoadmapPage />} />
          <Route path="/admin/pending" element={<PendingPage />} />
          <Route path="/admin/audit" element={<AuditPage />} />
          <Route path="/admin/export" element={<ExportPage />} />
          <Route path="/admin/masters" element={<MastersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
