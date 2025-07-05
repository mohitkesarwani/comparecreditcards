import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import commentsRouter from '../src/routes/comments.js';

let app;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  app = express();
  app.use(express.json());
  app.use('/api/comments', commentsRouter);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

test('post and fetch comments', async () => {
  const entityId = new mongoose.Types.ObjectId().toString();
  const payload = {
    userId: 'u1',
    entityId,
    entityType: 'credit-cards',
    commentText: 'Nice card'
  };
  const res = await request(app).post('/api/comments').send(payload);
  expect(res.status).toBe(201);
  expect(res.body.commentText).toBe('Nice card');

  const list = await request(app).get(`/api/comments?entityId=${entityId}`);
  expect(list.status).toBe(200);
  expect(list.body.length).toBe(1);
});
