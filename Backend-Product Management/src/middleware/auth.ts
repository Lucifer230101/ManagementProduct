import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';
import { env } from '../config/env';
import { HttpError } from '../utils/http';
import type { AuthUser } from '../types';

interface TokenPayload { sub: string; shopId: string; roleId: string; iat: number; exp: number; }

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Authentication required.');
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const result = await pool.query(
      `SELECT u.id,u.shop_id,u.role_id,u.is_active,r.name AS role_name
       FROM users u JOIN roles r ON r.id=u.role_id AND r.shop_id=u.shop_id
       WHERE u.id=$1 AND u.shop_id=$2`,
      [payload.sub,payload.shopId]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) throw new HttpError(401, 'Account is inactive or no longer exists.');
    req.auth = {
      id: user.id, shopId: user.shop_id, roleId: user.role_id,
      roleName: user.role_name, isOwner: user.role_name === 'Owner'
    } satisfies AuthUser;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token.'));
  }
};

export function requirePermission(code: string): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.auth) throw new HttpError(401, 'Authentication required.');
      if (req.auth.isOwner) return next();
      const result = await pool.query(
        `SELECT 1 FROM role_permissions rp
         JOIN permissions p ON p.id=rp.permission_id
         WHERE rp.role_id=$1 AND p.code=$2`,
        [req.auth.roleId,code]
      );
      if (!result.rowCount) throw new HttpError(403, `Missing permission: ${code}`);
      next();
    } catch (error) { next(error); }
  };
}