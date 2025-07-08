import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongod;
let app;
let Mortgage;
let statsRouter;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_MORTGAGE_URI = uri;
  Mortgage = (await import('../src/models/ResidentialMortgage.js')).default;
  statsRouter = (await import('../src/routes/mortgageStats.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/mortgage-stats', statsRouter);
});

afterAll(async () => {
  await Mortgage.db.close();
  await mongod.stop();
});

beforeEach(async () => {
  await Mortgage.deleteMany({});
});

test('returns summary statistics', async () => {
  const docs = [
    { productId: 'm1', lendingRates: [{ rate: 5.5 }] },
    { productId: 'm2', lendingRates: [{ rate: 7.2 }] }
  ];
  await Mortgage.insertMany(docs);
  const res = await request(app).get('/api/mortgage-stats');
  expect(res.status).toBe(200);
  expect(res.body.minInterestRate).toBeCloseTo(5.5);
  expect(res.body.maxInterestRate).toBeCloseTo(7.2);
  expect(res.body.totalMortgages).toBe(2);
});

