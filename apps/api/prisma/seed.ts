// Seed idempotente: trilhas, slots, finalidades de consentimento e staff admin.
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const TRACKS = [
  { key: 'catolica', namePt: 'Católica', nameEn: 'Catholic', sortOrder: 1 },
  { key: 'evangelica', namePt: 'Evangélica', nameEn: 'Evangelical', sortOrder: 2 },
  { key: 'espirita', namePt: 'Espírita', nameEn: 'Spiritist', sortOrder: 3 },
  { key: 'filosofica', namePt: 'Filosófica', nameEn: 'Philosophical', sortOrder: 4 },
  { key: 'buscador', namePt: 'Buscador', nameEn: 'Seeker', sortOrder: 5 },
];

const TIME_SLOTS = [
  { key: 'morning' as const, defaultTime: '07:00' },
  { key: 'midday' as const, defaultTime: '12:00' },
  { key: 'night' as const, defaultTime: '21:00' },
];

// Textos v1 dos consentimentos — específicos e destacados por finalidade (LGPD art. 11).
// Alterar texto = criar NOVA versão (nunca editar a vigente): o texto exibido é prova legal.
const CONSENT_PURPOSES: Array<{ key: string; textPt: string; textEn: string }> = [
  {
    key: 'spiritual_content',
    textPt:
      'Autorizo o uso da minha trilha espiritual escolhida para personalizar as reflexões que recebo. Entendo que essa escolha pode revelar minha convicção religiosa (dado sensível, LGPD art. 5º, II).',
    textEn:
      'I authorize the use of my chosen spiritual track to personalize the reflections I receive. I understand this choice may reveal my religious conviction (sensitive data).',
  },
  {
    key: 'health_checkins',
    textPt:
      'Autorizo o registro dos meus check-ins de humor, sono e alimentação para acompanhar meu bem-estar no app. São dados de saúde e ficam visíveis apenas para mim.',
    textEn:
      'I authorize recording my mood, sleep and eating check-ins to track my well-being in the app. This is health data, visible only to me.',
  },
  {
    key: 'journal',
    textPt:
      'Autorizo o armazenamento criptografado do meu caderno de reflexões e sonhos. Nenhuma pessoa da equipe consegue ler o conteúdo.',
    textEn:
      'I authorize encrypted storage of my reflections and dreams journal. No staff member can read its contents.',
  },
  {
    key: 'ai_insights',
    textPt:
      'Autorizo que uma IA analise meus registros para gerar insights pessoais (ex.: relações entre sono e prática). Posso revogar a qualquer momento.',
    textEn:
      'I authorize an AI to analyze my entries to generate personal insights (e.g., links between sleep and practice). I can revoke this at any time.',
  },
  {
    key: 'marketing_push',
    textPt:
      'Aceito receber notificações sobre novidades e conteúdos do app além das minhas rotinas configuradas.',
    textEn:
      'I agree to receive notifications about app news and content beyond my configured routines.',
  },
];

async function main() {
  for (const track of TRACKS) {
    await prisma.track.upsert({
      where: { key: track.key },
      update: { namePt: track.namePt, nameEn: track.nameEn, sortOrder: track.sortOrder },
      create: track,
    });
  }

  for (const slot of TIME_SLOTS) {
    await prisma.timeSlot.upsert({
      where: { key: slot.key },
      update: { defaultTime: slot.defaultTime },
      create: slot,
    });
  }

  for (const purpose of CONSENT_PURPOSES) {
    const record = await prisma.consentPurpose.upsert({
      where: { key: purpose.key as never },
      update: {},
      create: { key: purpose.key as never },
    });
    await prisma.consentVersion.upsert({
      where: { purposeId_version: { purposeId: record.id, version: 1 } },
      update: {},
      create: {
        purposeId: record.id,
        version: 1,
        textPt: purpose.textPt,
        textEn: purpose.textEn,
        effectiveAt: new Date('2026-07-01'),
      },
    });
  }

  // Staff admin inicial — em produção, trocar senha no primeiro acesso (e TOTP obrigatório).
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@voceconhecedeus.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin-dev-12345';
  await prisma.staffUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      role: 'admin',
      passwordHash: await argon2.hash(adminPassword),
    },
  });

  console.log('Seed ok: trilhas, slots, consentimentos e staff admin.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
