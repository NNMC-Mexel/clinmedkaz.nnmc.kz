import { config } from './config';

export function requireAdmin(ctx: any) {
  const user = ctx.state?.user;
  if (!user) ctx.throw(401, 'Unauthorized');
  if (user.role?.type !== config.paymentAdmin.roleType) ctx.throw(403, 'Forbidden');
  return user.username || user.email || `user:${user.id}`;
}
