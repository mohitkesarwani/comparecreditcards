import request from 'supertest';
import express from 'express';
import engagementRoutes from '../src/routes/engagementRoutes.js';
import { engagements, likedIpCache } from '../src/services/engagementStore.js';

describe('Engagement API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/engagement', engagementRoutes);
    for (const key of Object.keys(engagements)) delete engagements[key];
    likedIpCache.clear();
  });

  const productId = 'p1';

  test('GET defaults', async () => {
    const res = await request(app).get(`/api/engagement/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.likes).toBe(0);
    expect(res.body.shares).toBe(0);
    expect(res.body.comments).toBe(0);
    expect(res.body.reviews.length).toBe(0);
    expect(res.body.rating).toBe(0);
  });

  test('like once per ip', async () => {
    let res = await request(app).post(`/api/engagement/${productId}/like`);
    expect(res.status).toBe(200);
    expect(res.body.likes).toBe(1);
    res = await request(app).post(`/api/engagement/${productId}/like`);
    expect(res.status).toBe(429);
  });

  test('share increments', async () => {
    const res = await request(app).post(`/api/engagement/${productId}/share`);
    expect(res.status).toBe(200);
    expect(res.body.shares).toBe(1);
  });

  test('review updates rating', async () => {
    const review = { name: 'Alice', comment: 'Nice', stars: 4 };
    let res = await request(app)
      .post(`/api/engagement/${productId}/review`)
      .send(review);
    expect(res.status).toBe(201);
    expect(res.body.stars).toBe(4);

    res = await request(app).get(`/api/engagement/${productId}`);
    expect(res.body.comments).toBe(1);
    expect(res.body.rating).toBe(4);
  });
});
