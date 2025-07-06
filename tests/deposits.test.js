import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongod;
let app;
let Deposit;
let depositsRouter;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_DEPOSIT_URI = uri;
  Deposit = (await import('../src/models/Deposit.js')).default;
  depositsRouter = (await import('../src/routes/deposits.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/deposits', depositsRouter);
});

afterAll(async () => {
  await Deposit.db.close();
  await mongod.stop();
});

beforeEach(async () => {
  await Deposit.deleteMany({});
});

test('list deposits', async () => {
  await Deposit.create({ productId: 'd1', name: 'Deposit 1' });
  const res = await request(app).get('/api/deposits');
  expect(res.status).toBe(200);
  expect(res.body.length).toBe(1);
  expect(res.body[0].productId).toBe('d1');
});

test('get deposit by id', async () => {
  const doc = await Deposit.create({ productId: 'd2', name: 'Deposit 2' });
  const res = await request(app).get(`/api/deposits/${doc._id}`);
  expect(res.status).toBe(200);
  expect(res.body.productId).toBe('d2');
});
