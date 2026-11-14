import request from 'supertest';
import app from '../src/app.js';

describe('API', () => {
  test('expose le contrôle de santé', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'API Elikia opérationnelle',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });

  test('renvoie 404 pour une route inconnue', async () => {
    const response = await request(app).get('/api/v1/route-inconnue');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Route introuvable');
  });
});
