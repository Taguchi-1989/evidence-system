/** マスタ管理（システム管理者）。運用モード・ポリシー設定 + 部署マスタ（要件 §6, §7, §11.1）。 */
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  OPERATION_MODES,
  OPERATION_MODE_LABELS,
  MODE_POLICY_PRESETS,
  resolvePolicy,
  type OperationMode,
  type Policy,
} from '@evidence/shared';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

const POLICY_LABELS: Record<keyof Policy, string> = {
  evidenceRequired: '証跡提出を必須にする',
  claimLinkRequired: 'Claim紐づけを必須にする',
  allowNoEvidenceReason: '証跡なし理由の入力を許可する',
  auditAgentEnabled: '監査Agentを実行する',
  auditResultVisibleToUser: '監査結果を利用者に表示する',
  auditResultVisibleToManager: '監査結果を管理者（上長）に表示する',
  strictSubmissionValidation: '提出時に不足をブロックする',
  exportJsonEnabled: 'JSONエクスポートを有効にする',
  exportCsvEnabled: 'CSVエクスポートを有効にする',
};

function diffOverrides(policy: Policy, mode: OperationMode): Partial<Policy> {
  const preset = MODE_POLICY_PRESETS[mode];
  const out: Partial<Policy> = {};
  (Object.keys(policy) as (keyof Policy)[]).forEach((k) => {
    if (policy[k] !== preset[k]) out[k] = policy[k];
  });
  return out;
}

export function MastersPage() {
  const { notify } = useToast();
  const qc = useQueryClient();

  const { data: policyCfg } = useQuery({
    queryKey: ['policy', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.policy(DEFAULT_FISCAL_YEAR),
  });
  const { data: masters } = useQuery({
    queryKey: ['masters', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.masters(DEFAULT_FISCAL_YEAR),
  });

  const [mode, setMode] = React.useState<OperationMode>('MVP');
  const [policy, setPolicy] = React.useState<Policy>(MODE_POLICY_PRESETS.MVP);
  const [savingPolicy, setSavingPolicy] = React.useState(false);

  React.useEffect(() => {
    if (policyCfg) {
      setMode(policyCfg.mode);
      setPolicy(policyCfg.policy);
    }
  }, [policyCfg]);

  const onModeChange = (m: OperationMode) => {
    setMode(m);
    setPolicy(resolvePolicy(m, {})); // モード切替でプリセットを反映
  };

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      await endpoints.updatePolicy({ fiscalYear: DEFAULT_FISCAL_YEAR, mode, overrides: diffOverrides(policy, mode) });
      notify(messages.toast.saved);
      void qc.invalidateQueries({ queryKey: ['policy', DEFAULT_FISCAL_YEAR] });
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setSavingPolicy(false);
    }
  };

  // 部署追加
  const [deptId, setDeptId] = React.useState('');
  const [deptName, setDeptName] = React.useState('');
  const addDept = async () => {
    if (!deptId || !deptName) return;
    try {
      await endpoints.upsertDepartment({ fiscalYear: DEFAULT_FISCAL_YEAR, departmentId: deptId, name: deptName });
      notify(messages.toast.saved);
      setDeptId('');
      setDeptName('');
      void qc.invalidateQueries({ queryKey: ['masters', DEFAULT_FISCAL_YEAR] });
    } catch {
      notify(messages.toast.error, 'error');
    }
  };

  return (
    <div>
      <PageHeader title={messages.pages.mastersTitle} description={messages.pages.mastersDescription} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">運用モード・ポリシー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label>運用モード</Label>
            <Select value={mode} onChange={(e) => onModeChange(e.target.value as OperationMode)}>
              {OPERATION_MODES.map((m) => (
                <option key={m} value={m}>
                  {OPERATION_MODE_LABELS[m]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(POLICY_LABELS) as (keyof Policy)[]).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={policy[k]}
                  onChange={(e) => setPolicy((p) => ({ ...p, [k]: e.target.checked }))}
                />
                {POLICY_LABELS[k]}
              </label>
            ))}
          </div>

          <Button onClick={() => void savePolicy()} disabled={savingPolicy}>
            ポリシーを保存
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">部署マスタ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>部署ID</TH>
                <TH>名称</TH>
                <TH>上位部署</TH>
              </TR>
            </THead>
            <TBody>
              {masters?.departments.map((d) => (
                <TR key={d.departmentId}>
                  <TD className="font-mono text-xs">{d.departmentId}</TD>
                  <TD>{d.name}</TD>
                  <TD className="text-xs">{d.parentDepartmentId ?? '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="flex items-end gap-2 border-t pt-4">
            <div className="space-y-1.5">
              <Label>部署ID</Label>
              <Input value={deptId} onChange={(e) => setDeptId(e.target.value)} placeholder="dept-004" />
            </div>
            <div className="space-y-1.5">
              <Label>名称</Label>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="新部署" />
            </div>
            <Button variant="outline" onClick={() => void addDept()}>
              追加・更新
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
