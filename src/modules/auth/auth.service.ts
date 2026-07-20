import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    role: string;
  };
}

function generateTokens(userId: number, username: string, role: string) {
  const accessToken = jwt.sign({ id: userId, username, role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ id: userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export async function login(
  username: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    await prisma.auditLog.create({
      data: {
        action: "LOGIN_FAILED",
        details: `محاولة دخول فاشلة باسم المستخدم: ${username}`,
        ipAddress,
        userAgent,
      },
    });
    throw ApiError.unauthorized('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_FAILED",
        details: 'كلمة مرور خاطئة',
        ipAddress,
        userAgent,
      },
    });
    throw ApiError.unauthorized('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.username, user.role.name);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "LOGIN",
      details: 'تسجيل دخول ناجح',
      ipAddress,
      userAgent,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.name,
    },
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    const decoded = jwt.verify(refreshToken, env.jwt.refreshSecret) as { id: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('المستخدم غير موجود أو معطّل');
    }

    const { accessToken } = generateTokens(user.id, user.username, user.role.name);
    return accessToken;
  } catch {
    throw ApiError.unauthorized('رمز التحديث غير صالح، يرجى تسجيل الدخول مجددًا');
  }
}

export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('المستخدم غير موجود');

  const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isValid) throw ApiError.badRequest('كلمة المرور الحالية غير صحيحة');

  const newHash = await bcrypt.hash(newPassword, env.bcrypt.saltRounds);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });
}

export async function logout(userId: number, ipAddress?: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action: "LOGOUT",
      ipAddress,
    },
  });
}
