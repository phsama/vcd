'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface CalendarSlot {
  id: string;
  date: string;
  language: string;
  status: string;
  publishAt: string;
  track: { namePt: string };
  slot: { key: string };
  variant: { id: string; title: string; curationStatus: string } | null;
}

const STATUS_CLASS: Record<string, string> = {
  open: 'warn',
  filled: '',
  published: 'ok',
  skipped: 'warn',
};

export default function CalendarPage() {
  const [slots, setSlots] = useState<CalendarSlot[]>([]);

  useEffect(() => {
    api<CalendarSlot[]>('/admin/calendar')
      .then(setSlots)
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1>Calendário editorial (próximos 7 dias)</h1>
      <table style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Slot</th>
            <th>Trilha</th>
            <th>Idioma</th>
            <th>Publica às (UTC)</th>
            <th>Variante</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((s) => (
            <tr key={s.id}>
              <td>{s.date.slice(0, 10)}</td>
              <td>{s.slot.key}</td>
              <td>{s.track.namePt}</td>
              <td>{s.language === 'pt_BR' ? 'pt-BR' : s.language}</td>
              <td>{s.publishAt.slice(11, 16)}</td>
              <td>
                {s.variant ? (
                  <Link href={`/curation/${s.variant.id}`}>{s.variant.title}</Link>
                ) : (
                  <span style={{ color: '#b45309' }}>— sem variante aprovada —</span>
                )}
              </td>
              <td>
                <span className={`badge ${STATUS_CLASS[s.status] ?? ''}`}>{s.status}</span>
              </td>
            </tr>
          ))}
          {slots.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>
                Nenhum slot na grade — dispare a geração na Curadoria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
