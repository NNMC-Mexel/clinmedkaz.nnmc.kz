export function requireAdmin(ctx: any) {
  const user = ctx.state?.user;
  if (user) return user.username || user.email || `user:${user.id}`;
  ctx.throw(401, 'Unauthorized');
}
