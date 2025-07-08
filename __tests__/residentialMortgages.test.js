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

test('pagination returns metadata', async () => {
  const docs = [
    { productId: 'm1', name: 'Mortgage 1' },
    { productId: 'm2', name: 'Mortgage 2' },
    { productId: 'm3', name: 'Mortgage 3' }
  ];
  await Mortgage.insertMany(docs);
  const res = await request(app)
    .get('/api/residential-mortgages?page=1&limit=2');
  expect(res.status).toBe(200);
  expect(res.body.total).toBe(3);
  expect(res.body.page).toBe(1);
  expect(res.body.limit).toBe(2);
  expect(res.body.data.length).toBe(2);
});

test('invalid pagination returns 400', async () => {
  const res = await request(app)
    .get('/api/residential-mortgages?page=0&limit=-1');
  expect(res.status).toBe(400);
});
