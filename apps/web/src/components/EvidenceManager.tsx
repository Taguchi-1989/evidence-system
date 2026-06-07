/** 証跡の一覧・アップロード(presigned URL 直PUT)・削除。入力画面と詳細画面で共用。 */
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EVIDENCE_TYPES,
  EVIDENCE_TYPE_LABELS,
  RELATED_AXES,
  RELATED_AXIS_LABELS,
  ALLOWED_UPLOAD_EXTENSIONS,
  isAllowedExtension,
  type EvidenceType,
  type RelatedAxis,
} from '@evidence/shared';
import { endpoints } from '@/lib/endpoints';
import { putToPresignedUrl } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

export function EvidenceManager({
  submissionId,
  editable,
}: {
  submissionId: string;
  editable: boolean;
}) {
  const qc = useQueryClient();
  const { notify } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [evidenceType, setEvidenceType] = React.useState<EvidenceType>('REPORT');
  const [relatedAxis, setRelatedAxis] = React.useState<RelatedAxis>('UNCLASSIFIED');
  const [description, setDescription] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['evidence', submissionId],
    queryFn: () => endpoints.listEvidence(submissionId),
  });
  const items = data?.items ?? [];

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['evidence', submissionId] });
    void qc.invalidateQueries({ queryKey: ['submission', submissionId] });
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!isAllowedExtension(file.name)) {
      notify('許可されていないファイル形式です', 'error');
      return;
    }
    setUploading(true);
    try {
      const presign = await endpoints.presign(submissionId, {
        originalFileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
        evidenceType,
        relatedAxis,
        description,
      });
      await putToPresignedUrl(presign.uploadUrl, file);
      await endpoints.confirmEvidence(submissionId, { evidenceId: presign.evidenceId });
      notify(messages.toast.uploaded);
      setFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      invalidate();
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (evidenceId: string) => {
    try {
      const { url } = await endpoints.evidenceDownloadUrl(submissionId, evidenceId);
      window.open(url, '_blank');
    } catch {
      notify(messages.toast.error, 'error');
    }
  };

  const handleDelete = async (evidenceId: string, fileName: string) => {
    if (!window.confirm(`${messages.evidence.deleteConfirm}\n${fileName}`)) return;
    try {
      await endpoints.deleteEvidence(submissionId, evidenceId);
      notify(messages.toast.deleted);
      invalidate();
    } catch {
      notify(messages.toast.error, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <Table>
          <THead>
            <TR>
              <TH>{messages.evidence.fileLabel}</TH>
              <TH>{messages.fields.evidenceType}</TH>
              <TH>{messages.fields.relatedAxis}</TH>
              <TH>{messages.fields.status}</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {items.map((ev) => (
              <TR key={ev.evidenceId}>
                <TD className="font-medium">{ev.originalFileName}</TD>
                <TD className="text-xs">{EVIDENCE_TYPE_LABELS[ev.evidenceType]}</TD>
                <TD className="text-xs">{RELATED_AXIS_LABELS[ev.relatedAxis]}</TD>
                <TD>
                  <Badge variant={ev.storageStatus === 'uploaded' ? 'success' : 'muted'}>
                    {ev.storageStatus === 'uploaded' ? '保存済み' : ev.storageStatus}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => void handleDownload(ev.evidenceId)}>
                      {messages.actions.download}
                    </Button>
                    {editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void handleDelete(ev.evidenceId, ev.originalFileName)}
                      >
                        {messages.actions.delete}
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">{messages.evidence.empty}</p>
      )}

      {editable && (
        <div className="rounded-md border border-dashed p-4">
          <p className="text-sm text-muted-foreground">{messages.evidence.attachHint}</p>
          <p className="text-xs text-muted-foreground">{messages.evidence.optionalNote}</p>
          <p className="mb-3 text-xs text-muted-foreground">{messages.evidence.allowedFormatsLabel}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{messages.evidence.fileLabel}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(',')}
                disabled={uploading}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1">
              <Label>{messages.fields.evidenceType}</Label>
              <Select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
              >
                {EVIDENCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EVIDENCE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{messages.fields.relatedAxis}</Label>
              <Select
                value={relatedAxis}
                onChange={(e) => setRelatedAxis(e.target.value as RelatedAxis)}
              >
                {RELATED_AXES.map((a) => (
                  <option key={a} value={a}>
                    {RELATED_AXIS_LABELS[a]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{messages.fields.description}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={() => void handleUpload()} disabled={!file || uploading}>
              {uploading ? messages.evidence.uploading : messages.actions.upload}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
