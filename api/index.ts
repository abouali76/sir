import { createApp } from '../src/app';
import { connectDatabase } from '../src/config/database';

const app = createApp();

let isConnected = false;

app.use(async (req, res, next) => {
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err) {
      console.error('Database connection failed:', err);
    }
  }
  next();
});

export default app;
