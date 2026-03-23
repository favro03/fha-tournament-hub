export type AppRole = "SUPER_ADMIN" | "ADMIN" | undefined | null;

export function isAdmin(role: AppRole) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: AppRole) {
  return role === "SUPER_ADMIN";
}