import { roleFromType, type PaymentRole } from './roles';

export function requireRole(ctx: any, allowed: PaymentRole[]) {
  const user = ctx.state?.user;
  if (!user) ctx.throw(401, 'Unauthorized');
  const role = roleFromType(user.role?.type);
  if (!role || !allowed.includes(role)) ctx.throw(403, 'Forbidden');
  return { actor: user.username || user.email || `user:${user.id}`, role: role as PaymentRole };
}

export function requireAdmin(ctx: any) {
  return requireRole(ctx, ['admin']).actor;
}
