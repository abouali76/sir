import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Singleton pattern لمنع فتح اتصالات متعددة أثناء hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

type PrismaLogEvent = { message: string; target?: string };

(prisma as unknown as { $on(event: 'error', cb: (e: PrismaLogEvent) => void): void }).$on(
  'error',
  (e) => logger.error('Prisma Error', e)
);
(prisma as unknown as { $on(event: 'warn', cb: (e: PrismaLogEvent) => void): void }).$on(
  'warn',
  (e) => logger.warn('Prisma Warning', e)
);

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ تم الاتصال بقاعدة البيانات بنجاح');
  } catch (error) {
    logger.error('❌ فشل الاتصال بقاعدة البيانات', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
