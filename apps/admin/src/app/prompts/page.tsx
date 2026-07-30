'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Prompt {
  id: string;
  key: string;
  version: number;
  body: string;
  active: boolean;
  language: string | null;
  notes: string | null;
  track: { namePt: string } | null;
  slot: { key: string } | null;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [key, setKey] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setPrompts(await api<Prompt[]>('/admin/prompts'));
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/admin/prompts', { method: 'POST', body: { key, body } });
      setKey('');
      setBody('');
      setMessage('Prompt criado (nova versão se a key já existia)');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'erro');
    }
  }

  async function toggle(p: Prompt) {
    await api(`/admin/prompts/${p.id}`, { method: 'PATCH', body: { active: !p.active } });
    await load();
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <h1>Banco de prompts</h1>
      <p style={{ color: '#666', margin: '0.5rem 0 1rem' }}>
        Prompts são versionados: criar com uma key existente gera nova versão, nunca sobrescreve.
      </p>

      <form onSubmit={create} className="stack" style={{ marginBottom: '1.5rem' }}>
        <input
          placeholder="key (ex.: base-reflexao)"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
        />
        <textarea
          rows={4}
          placeholder="Corpo do prompt (template)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="row">
          <button type="submit">＋ Criar prompt/versão</button>
          {message && <span className="notice">{message}</span>}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>v</th>
            <th>Trilha</th>
            <th>Slot</th>
            <th>Idioma</th>
            <th>Ativo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {prompts.map((p) => (
            <tr key={p.id}>
              <td title={p.body}>{p.key}</td>
              <td>{p.version}</td>
              <td>{p.track?.namePt ?? 'todas'}</td>
              <td>{p.slot?.key ?? 'todos'}</td>
              <td>{p.language ?? 'ambos'}</td>
              <td>
                <span className={`badge ${p.active ? 'ok' : ''}`}>{p.active ? 'sim' : 'não'}</span>
              </td>
              <td>
                <button onClick={() => toggle(p)}>{p.active ? 'Desativar' : 'Ativar'}</button>
              </td>
            </tr>
          ))}
          {prompts.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>
                Nenhum prompt — sem prompt ativo, o gerador usa o prompt padrão embutido.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
