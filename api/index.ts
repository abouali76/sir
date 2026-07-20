import { Request, Response } from 'express';
import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';

const app = createApp();
let isConnected = false;

export default async function handler(req: Request, res: Response) {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err) {
      console.error('Database connection failed:', err);
    }
  }
  return app(req, res);
}
