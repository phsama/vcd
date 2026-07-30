'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface QueueItem {
  id: string;
  title: string;
  language: string;
  curationStatus: string;
  citationSource: string | null;
  citationVerified: boolean;
  createdAt: string;
  reflection: {
    scheduledDate: string | null;
    track: { namePt: string; key: string };
    slot: { key: string };
  };
}

export default function CurationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const query = status ? `?status=${status}` : '';
    setItems(await api<QueueItem[]>(`/admin/curation/queue${query}`));
  }, [status]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function trigger(path: string, label: string) {
    setBusy(label);
    setMessage('');
    try {
      const res = await api<Record<string, number>>(`/admin/pipeline/${path}`, { method: 'POST' });
      setMessage(`${label}: ${JSON.stringify(res)}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'erro');
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <div className="row-between">
        <h1>Fila de curadoria</h1>
        <div className="row">
          <button disabled={!!busy} onClick={() => trigger('generate-now', 'Geração')}>
            {busy === 'Geração' ? 'Gerando…' : '⚙ Gerar agora'}
          </button>
          <button disabled={!!busy} onClick={() => trigger('publish-due', 'Publicação')}>
            {busy === 'Publicação' ? 'Publicando…' : '📤 Publicar vencidos'}
          </button>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      <div className="row" style={{ margin: '1rem 0' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Em revisão (padrão)</option>
          <option value="approved">Aprovadas</option>
          <option value="scheduled">Agendadas</option>
          <option value="published">Publicadas</option>
          <option value="rejected">Rejeitadas</option>
          <option value="archived">Arquivadas</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Trilha</th>
            <th>Slot</th>
            <th>Idioma</th>
            <th>Data</th>
            <th>Citação</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.id}>
              <td>
                <Link href={`/curation/${v.id}`}>{v.title}</Link>
              </td>
              <td>{v.reflection.track.namePt}</td>
              <td>{v.reflection.slot.key}</td>
              <td>{v.language === 'pt_BR' ? 'pt-BR' : v.language}</td>
              <td>{v.reflection.scheduledDate?.slice(0, 10) ?? '—'}</td>
              <td>
                {v.citationSource ? (
                  <span className={v.citationVerified ? 'badge ok' : 'badge warn'}>
                    {v.citationVerified ? '✓ verificada' : '! pendente'}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td>
                <span className="badge">{v.curationStatus}</span>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>
                Fila vazia — use “Gerar agora” para criar variantes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
