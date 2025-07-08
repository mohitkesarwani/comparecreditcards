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

function toIds(records) {
  return records.map(r => r.productId);
}

test('cursor pagination works across multiple requests', async () => {
  const docs = [
    { productId: 'm1', name: 'Mortgage 1' },
    { productId: 'm2', name: 'Mortgage 2' },
    { productId: 'm3', name: 'Mortgage 3' },
    { productId: 'm4', name: 'Mortgage 4' }
  ];
  await Mortgage.insertMany(docs);

  const first = await request(app).get('/api/residential-mortgages?limit=2');
  expect(first.status).toBe(200);
  expect(first.body.data).toHaveLength(2);
  const firstIds = toIds(first.body.data);
  const cursor1 = first.body.nextCursor;
  expect(cursor1).toBeTruthy();

  const second = await request(app).get(`/api/residential-mortgages?cursor=${cursor1}&limit=2`);
  expect(second.status).toBe(200);
  expect(second.body.data).toHaveLength(2);
  const secondIds = toIds(second.body.data);
  const cursor2 = second.body.nextCursor;

  // ensure no duplicates and proper ordering
  expect(new Set([...firstIds, ...secondIds]).size).toBe(4);
  expect(cursor2).toBeNull();
});

test('invalid cursor returns 400', async () => {
  const res = await request(app).get('/api/residential-mortgages?cursor=badid');
  expect(res.status).toBe(400);
});

test('limit is capped at 50', async () => {
  const docs = Array.from({ length: 60 }, (_, i) => ({ productId: `m${i}`, name: `m${i}` }));
  await Mortgage.insertMany(docs);

  const res = await request(app).get('/api/residential-mortgages?limit=100');
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBeLessThanOrEqual(50);
});
