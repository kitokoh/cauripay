/**
 * E2E kyc-service — exécution locale avec Postgres (voir README).
 * Auth RÉELLE en mode dev (HS256, JWT_SECRET) : on signe des tokens avec les
 * rôles Keycloak (realm_access.roles) — le guard complet est exercé.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';

const JWT_SECRET = 'dev-jwt-secret-0123456789';

function tokenFor(sub: string, roles: string[]): string {
  return jwt.sign({ sub, realm_access: { roles }, preferred_username: sub }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
}

describe('kyc-service E2E (GOURSI-024)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('submit → PENDING puis approve par officier → APPROVED (+ 403 hors rôle, 409 double traitement)', async () => {
    const customer = tokenFor('u_customer', ['CUSTOMER']);
    const created = await request(app.getHttpServer())
      .post('/api/v1/kyc/submit')
      .set('Authorization', `Bearer ${customer}`)
      .send({ level: 'VERIFIED', documentType: 'PASSPORT', documentBase64: Buffer.from('doc-bin').toString('base64') })
      .expect(201);
    expect(created.body.data.status).toBe('PENDING');
    expect(created.body.data.documentEnc).toBeUndefined();
    expect(created.body.data.documentType).toBe('PASSPORT');

    // token invalide → 401 ; CUSTOMER sur la file → 403
    await request(app.getHttpServer()).get('/api/v1/kyc/queue').expect(401);
    await request(app.getHttpServer()).get('/api/v1/kyc/queue').set('Authorization', `Bearer ${customer}`).expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/kyc/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${customer}`)
      .expect(403);

    // l'officier voit la file et approuve
    const officer = tokenFor('u_officer', ['COMPLIANCE_OFFICER']);
    const queue = await request(app.getHttpServer())
      .get('/api/v1/kyc/queue')
      .set('Authorization', `Bearer ${officer}`)
      .expect(200);
    expect(queue.body.data.records.some((r: { id: string }) => r.id === created.body.data.id)).toBe(true);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/kyc/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${officer}`)
      .expect(201);
    expect(approved.body.data.status).toBe('APPROVED');
    expect(approved.body.data.reviewedBy).toBe('u_officer');

    // double approbation → 409
    await request(app.getHttpServer())
      .post(`/api/v1/kyc/${created.body.data.id}/approve`)
      .set('Authorization', `Bearer ${officer}`)
      .expect(409);
  });

  it('reject avec raison → REJECTED ; dossier inconnu → 404', async () => {
    const customer = tokenFor('u_customer2', ['CUSTOMER']);
    const officer = tokenFor('u_officer2', ['COMPLIANCE_OFFICER']);

    const created = await request(app.getHttpServer())
      .post('/api/v1/kyc/submit')
      .set('Authorization', `Bearer ${customer}`)
      .send({ level: 'PREMIUM', documentType: 'NATIONAL_ID', documentBase64: Buffer.from('x').toString('base64') })
      .expect(201);

    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/kyc/${created.body.data.id}/reject`)
      .set('Authorization', `Bearer ${officer}`)
      .send({ reason: 'document illisible' })
      .expect(201);
    expect(rejected.body.data.status).toBe('REJECTED');
    expect(rejected.body.data.rejectReason).toBe('document illisible');

    await request(app.getHttpServer())
      .post('/api/v1/kyc/cky_inconnu/approve')
      .set('Authorization', `Bearer ${officer}`)
      .expect(404);
  });
});
