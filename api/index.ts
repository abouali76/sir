import { Request, Response } from 'express';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const app = createApp();
let isConnected = false;

export default async function handler(req: Request, res: Response) {
  try {
    if (!isConnected) {
      await prisma.$connect();
      isConnected = true;
    }
  } catch (err) {
    console.error('DB connect error:', err);
  }
  return app(req, res);
}
