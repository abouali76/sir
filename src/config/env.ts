import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`❌ متغير البيئة المطلوب غير موجود: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(required('PORT', '5000'), 10),
  nodeEnv: required('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: required('JWT_EXPIRES_IN', '8h'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    refreshExpiresIn: required('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  bcrypt: {
    saltRounds: parseInt(required('BCRYPT_SALT_ROUNDS', '12'), 10),
  },

  rateLimit: {
    windowMs: parseInt(required('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(required('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },

  clientUrl: required('CLIENT_URL', 'http://localhost:3000'),
};
