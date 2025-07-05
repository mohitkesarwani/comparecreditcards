import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import CreditCard from '../src/models/CreditCard.js';
import { mockAuth } from '../src/middleware/auth.js';

let mongod;
let app;
let shareRoutes;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_MORTGAGE_URI = uri;
  await mongoose.connect(uri);
  shareRoutes = (await import('../src/routes/shareRoutes.js')).default;
  app = express();
  app.use(express.json());
  app.use(mockAuth);
  app.use('/api', shareRoutes);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

test('share creates post and increments count', async () => {
  const card = await CreditCard.create({ productId: 'c1' });
  const res = await request(app)
    .post('/api/share')
    .set({ 'x-user-id': 'u1', 'x-user-name': 'Alice' })
    .send({
      sharedEntityId: card._id.toString(),
      sharedEntityType: 'creditCard',
      commentText: '<b>hello</b>'
    });
  expect(res.status).toBe(201);
  expect(res.body.commentText).toBe('&lt;b&gt;hello&lt;/b&gt;');
  const updated = await CreditCard.findById(card._id);
  expect(updated.shareCount).toBe(1);
});

test('get share-count', async () => {
  const card = await CreditCard.create({ productId: 'c2', shareCount: 3 });
  const res = await request(app).get(`/api/share-count/creditCard/${card._id}`);
  expect(res.status).toBe(200);
  expect(res.body.shareCount).toBe(3);
});

test('get shared posts', async () => {
  const card = await CreditCard.create({ productId: 'c3' });
  await request(app)
    .post('/api/share')
    .set({ 'x-user-id': 'u99' })
    .send({
      sharedEntityId: card._id.toString(),
      sharedEntityType: 'creditCard',
      commentText: 'Hi'
    });
  const res = await request(app).get('/api/shared-posts/u99');
  expect(res.status).toBe(200);
  expect(res.body.length).toBe(1);
  expect(res.body[0].entity.productId).toBe('c3');
});
