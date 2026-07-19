import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`🚀 الخادم يعمل على المنفذ ${env.port} (${env.nodeEnv})`);
  });

  // إيقاف آمن للخادم (Graceful Shutdown)
  const shutdown = async (signal: string) => {
    logger.info(`تم استلام إشارة ${signal}، جاري إيقاف الخادم بأمان...`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('تم إيقاف الخادم بنجاح');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap();
