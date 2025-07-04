import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import interactionsRouter from '../src/routes/interactions.js';
import { mockAuth } from '../src/middleware/auth.js';

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  app = express();
  app.use(express.json());
  app.use(mockAuth);
  app.use('/api/interactions', interactionsRouter);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Interactions API', () => {
  const productId = 'card_1';
  const type = 'creditCard';

  test('GET returns defaults', async () => {
    const res = await request(app).get(`/api/interactions/${productId}?type=${type}`);
    expect(res.status).toBe(200);
    expect(res.body.likeCount).toBe(0);
    expect(res.body.shareCount).toBe(0);
  });

  test('like toggle', async () => {
    const headers = { 'x-user-id': 'u1', 'x-user-name': 'Test' };
    const url = `/api/interactions/${productId}/like?type=${type}`;
    let res = await request(app).post(url).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.likeCount).toBe(1);
    res = await request(app).post(url).set(headers);
    expect(res.body.likeCount).toBe(0);
  });

  test('comment and sanitize', async () => {
    const headers = { 'x-user-id': 'u2', 'x-user-name': 'Bob' };
    const url = `/api/interactions/${productId}/comment?type=${type}`;
    const res = await request(app)
      .post(url)
      .set(headers)
      .send({ text: '<b>hi</b>' });
    expect(res.status).toBe(201);
    expect(res.body.text).toBe('&lt;b&gt;hi&lt;/b&gt;');
  });

  test('share increments', async () => {
    const url = `/api/interactions/${productId}/share?type=${type}`;
    const res = await request(app).post(url);
    expect(res.status).toBe(200);
    expect(res.body.shareCount).toBe(1);
  });

  test('auth required for like', async () => {
    const url = `/api/interactions/${productId}/like?type=${type}`;
    const res = await request(app).post(url);
    expect(res.status).toBe(401);
  });
});
