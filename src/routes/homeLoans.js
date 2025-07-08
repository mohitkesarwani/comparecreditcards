import express from 'express';
import residentialMortgagesRouter from './residentialMortgages.js';

const router = express.Router();

router.use((req, res, next) => {
  console.warn('Deprecated route /api/home-loans used; prefer /api/residential-mortgages');
  next();
});

router.use('/', residentialMortgagesRouter);

export default router;
