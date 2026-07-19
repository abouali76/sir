import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { PrismaClient } from '@prisma/client';

interface JwtPayload {
  id: number;
  username: string;
  role: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const tokenFromCookie = req.cookies?.accessToken;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      throw ApiError.unauthorized('يرجى تسجيل الدخول للمتابعة');
    }

    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(ApiError.unauthorized('رمز الدخول غير صالح'));
    }
    next(error);
  }
}
