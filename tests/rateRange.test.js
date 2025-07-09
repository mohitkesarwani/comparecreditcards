import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';

let mongod;
let app;
let Mortgage;
let router;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_MORTGAGE_URI = uri;
  Mortgage = (await import('../src/models/ResidentialMortgage.js')).default;
  router = (await import('../src/routes/residentialMortgages.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/residential-mortgages', router);
});

afterAll(async () => {
  await Mortgage.db.close();
  await mongod.stop();
});

beforeEach(async () => {
  await Mortgage.deleteMany({});
});

test('returns rate range', async () => {
  const docs = [
    { productId: 'm1', lendingRates: [{ rate: 5.5 }] },
    { productId: 'm2', lendingRates: [{ rate: 7.2 }] }
  ];
  await Mortgage.insertMany(docs);
  const res = await request(app).get('/api/residential-mortgages/rate-range');
  expect(res.status).toBe(200);
  expect(res.body.minRate).toBeCloseTo(5.5);
  expect(res.body.maxRate).toBeCloseTo(7.2);
});

test('handles string and numeric rates', async () => {
  const docs = [
    { productId: 'm1', lendingRates: [{ rate: '0.0575' }, { rate: 0.1 }] },
    { productId: 'm2', lendingRates: [{ rate: '0.1599' }, { rate: null }] },
    { productId: 'm3', lendingRates: [] }
  ];
  await Mortgage.insertMany(docs);
  const res = await request(app).get('/api/residential-mortgages/rate-range');
  expect(res.status).toBe(200);
  expect(res.body.minRate).toBeCloseTo(0.0575);
  expect(res.body.maxRate).toBeCloseTo(0.1599);
});

test('uses fallback when no valid rates found', async () => {
  await Mortgage.insertMany([
    { productId: 'm1', lendingRates: [{ rate: null }] },
    { productId: 'm2', lendingRates: [{ rate: 'abc' }] }
  ]);
  const res = await request(app).get('/api/residential-mortgages/rate-range');
  expect(res.status).toBe(200);
  expect(res.body.minRate).toBeCloseTo(0.05);
  expect(res.body.maxRate).toBeCloseTo(0.15);
});
