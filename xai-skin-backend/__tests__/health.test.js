const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');

describe('GET /health', () => {
  it('returns JSON with ok flag', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body).toMatchObject({
      ok: true,
      mongo: expect.any(Boolean),
      uptime: expect.any(Number),
      ts: expect.any(String),
    });
  });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});
