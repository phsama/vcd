import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Você conhece Deus? — Admin',
  description: 'Painel administrativo: curadoria, moderação, usuários e analytics.',
};

const NAV = [
  { href: '/curation', label: 'Curadoria' },
  { href: '/calendar', label: 'Calendário' },
  { href: '/prompts', label: 'Prompts' },
  { href: '/moderation', label: 'Moderação' },
  { href: '/users', label: 'Usuários' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/audit', label: 'Auditoria' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand">
              Você conhece Deus?
            </Link>
            <nav>
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
