import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import CreditCard from '../src/models/CreditCard.js';
import { mockAuth } from '../src/middleware/auth.js';

let mongod;
let app;
let shareRoutes;
let Deposit;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_MORTGAGE_URI = uri;
  process.env.MONGO_DEPOSIT_URI = uri;
  await mongoose.connect(uri);
  Deposit = (await import('../src/models/Deposit.js')).default;
  shareRoutes = (await import('../src/routes/shareRoutes.js')).default;
  app = express();
  app.use(express.json());
  app.use(mockAuth);
  app.use('/api', shareRoutes);
});

afterAll(async () => {
  await mongoose.connection.close();
  if (Deposit?.db) {
    await Deposit.db.close();
  }
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

test('share deposit', async () => {
  const dep = await Deposit.create({ productId: 'd1' });
  const res = await request(app)
    .post('/api/share')
    .set({ 'x-user-id': 'u2' })
    .send({
      sharedEntityId: dep._id.toString(),
      sharedEntityType: 'deposit'
    });
  expect(res.status).toBe(201);
  const updated = await Deposit.findById(dep._id);
  expect(updated.shareCount).toBe(1);
});
