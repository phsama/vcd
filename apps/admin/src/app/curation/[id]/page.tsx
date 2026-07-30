'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Variant {
  id: string;
  title: string;
  bodyText: string;
  language: string;
  curationStatus: string;
  citationSource: string | null;
  citationVerified: boolean;
  curatorNotes: string | null;
  aiModel: string | null;
  reflection: {
    scheduledDate: string | null;
    track: { namePt: string };
    slot: { key: string };
  };
}

export default function VariantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [citation, setCitation] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const v = await api<Variant>(`/admin/curation/variants/${id}`);
    setVariant(v);
    setTitle(v.title);
    setBody(v.bodyText);
    setCitation(v.citationSource ?? '');
    setNotes(v.curatorNotes ?? '');
  }, [id]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function run(fn: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(successMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy(false);
    }
  }

  if (!variant) return <p>Carregando…</p>;

  const editable = ['in_review', 'needs_changes'].includes(variant.curationStatus);

  return (
    <div style={{ maxWidth: 760 }}>
      <button onClick={() => router.push('/curation')} className="link">
        ← Voltar à fila
      </button>
      <div className="row-between" style={{ marginTop: '0.5rem' }}>
        <h1 style={{ fontSize: '1.3rem' }}>
          {variant.reflection.track.namePt} · {variant.reflection.slot.key} ·{' '}
          {variant.language === 'pt_BR' ? 'pt-BR' : variant.language} ·{' '}
          {variant.reflection.scheduledDate?.slice(0, 10)}
        </h1>
        <span className="badge">{variant.curationStatus}</span>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem' }}>Gerada por: {variant.aiModel}</p>

      <div className="stack" style={{ marginTop: '1rem' }}>
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} />
        </label>
        <label>
          Texto
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!editable}
          />
        </label>
        <label>
          Fonte da citação (obrigatório verificar antes de aprovar)
          <input
            value={citation}
            onChange={(e) => setCitation(e.target.value)}
            disabled={!editable}
            placeholder="ex.: Mateus 11:28 — deixe vazio se não houver citação"
          />
          {variant.citationSource && (
            <span className={variant.citationVerified ? 'badge ok' : 'badge warn'}>
              {variant.citationVerified ? '✓ citação verificada' : '! citação NÃO verificada'}
            </span>
          )}
        </label>
        <label>
          Notas do curador
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {error && <p className="error">{error}</p>}
        {message && <p className="notice">{message}</p>}

        <div className="row">
          {editable && (
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () =>
                    api(`/admin/curation/variants/${id}`, {
                      method: 'PATCH',
                      body: {
                        title,
                        bodyText: body,
                        citationSource: citation || undefined,
                        curatorNotes: notes || undefined,
                      },
                    }),
                  'Alterações salvas',
                )
              }
            >
              💾 Salvar
            </button>
          )}
          {variant.citationSource && !variant.citationVerified && (
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () => api(`/admin/curation/variants/${id}/verify-citation`, { method: 'POST' }),
                  'Citação marcada como verificada',
                )
              }
            >
              🔍 Verifiquei a citação na fonte
            </button>
          )}
          {editable && (
            <>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  run(
                    () => api(`/admin/curation/variants/${id}/approve`, { method: 'POST' }),
                    'Aprovada — áudio enfileirado',
                  )
                }
              >
                ✅ Aprovar
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api(`/admin/curation/variants/${id}/request-changes`, {
                        method: 'POST',
                        body: { notes },
                      }),
                    'Marcada como precisa de mudanças',
                  )
                }
              >
                ✏ Pedir mudanças
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api(`/admin/curation/variants/${id}/reject`, {
                        method: 'POST',
                        body: { notes },
                      }),
                    'Rejeitada',
                  )
                }
              >
                🗑 Rejeitar
              </button>
            </>
          )}
          {variant.curationStatus === 'needs_changes' && (
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () => api(`/admin/curation/variants/${id}/resubmit`, { method: 'POST' }),
                  'De volta à revisão',
                )
              }
            >
              ↩ Reenviar para revisão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
