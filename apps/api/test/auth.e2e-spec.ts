import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth + Consents + Me (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const email = `e2e-${Date.now()}@teste.local`;
  const password = 'senha-segura-123';
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra com email, senha e trilha', async () => {
    const res = await request(http)
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Testadora E2E', trackKey: 'espirita' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.trackKey).toBe('espirita');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('rejeita registro duplicado', () =>
    request(http)
      .post('/v1/auth/register')
      .send({ email, password, displayName: 'Duplicada' })
      .expect(409));

  it('faz login com as credenciais', async () => {
    const res = await request(http).post('/v1/auth/login').send({ email, password }).expect(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('GET /me com o access token', async () => {
    const res = await request(http)
      .get('/v1/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.email).toBe(email);
    expect(res.body.track.key).toBe('espirita');
  });

  it('troca de trilha livremente', async () => {
    const res = await request(http)
      .put('/v1/me/track')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ trackKey: 'filosofica' })
      .expect(200);
    expect(res.body.track.key).toBe('filosofica');
  });

  it('concede consentimento (append-only) e lê o estado', async () => {
    await request(http)
      .post('/v1/consents')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ purposeKey: 'health_checkins', granted: true })
      .expect(201);

    const state = await request(http)
      .get('/v1/consents/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(state.body.health_checkins).toBe(true);

    // Revogar = linha nova; histórico preserva as duas
    await request(http)
      .post('/v1/consents')
      .set('authorization', `Bearer ${accessToken}`)
      .send({ purposeKey: 'health_checkins', granted: false })
      .expect(201);

    const history = await request(http)
      .get('/v1/consents/me/history')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    const rows = history.body.filter(
      (r: { consentVersion: { purpose: { key: string } } }) =>
        r.consentVersion.purpose.key === 'health_checkins',
    );
    expect(rows.length).toBe(2);
  });

  it('rotaciona o refresh token e detecta reuso (revoga a família)', async () => {
    const first = await request(http).post('/v1/auth/refresh').send({ refreshToken }).expect(200);
    const rotated = first.body.refreshToken;
    expect(rotated).not.toBe(refreshToken);

    // Reusar o token antigo → 401 e a família inteira cai
    await request(http).post('/v1/auth/refresh').send({ refreshToken }).expect(401);

    // O token novo da mesma família também morreu
    await request(http).post('/v1/auth/refresh').send({ refreshToken: rotated }).expect(401);
  });

  it('JWT de usuário é rejeitado em rota admin (audience)', () =>
    request(http)
      .get('/v1/admin/curation/queue')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(401));

  it('JWT de staff é rejeitado em rota de usuário (audience)', async () => {
    const staffLogin = await request(http)
      .post('/v1/admin/auth/login')
      .send({ email: 'admin@voceconhecedeus.local', password: 'admin-dev-12345' })
      .expect(201);

    await request(http)
      .get('/v1/me')
      .set('authorization', `Bearer ${staffLogin.body.token}`)
      .expect(401);
  });

  it('exporta os dados (portabilidade LGPD)', async () => {
    const res = await request(http)
      .get('/v1/me/export')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.profile.email).toBe(email);
    expect(res.body.consents.length).toBeGreaterThanOrEqual(2);
  });

  it('DELETE /me marca exclusão, revoga sessões e bloqueia novo login', async () => {
    const res = await request(http)
      .delete('/v1/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.status).toBe('deletion_requested');

    await request(http).post('/v1/auth/login').send({ email, password }).expect(401);
  });
});
