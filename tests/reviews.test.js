import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import reviewsRouter from '../src/routes/reviews.js';
import engagementRoutes from '../src/routes/engagementRoutes.js';
import { clearEngagementCache } from '../src/services/engagementStore.js';

let app;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  app = express();
  app.use(express.json());
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/products', engagementRoutes);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  clearEngagementCache();
});

test('post review updates engagement', async () => {
  const payload = {
    userId: 'u1',
    entityId: 'p123',
    entityType: 'credit-cards',
    rating: 5,
    commentText: 'Great card'
  };
  const res = await request(app).post('/api/reviews').send(payload);
  expect(res.status).toBe(201);
  expect(res.body.stars).toBe(5);

  const engagement = await request(app).get('/api/products/p123/engagement');
  expect(engagement.status).toBe(200);
  expect(engagement.body.comments).toBe(1);
  expect(engagement.body.rating).toBe(5);
});
