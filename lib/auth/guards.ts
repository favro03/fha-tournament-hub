import { auth } from "@/auth";
import { isAdmin, isSuperAdmin } from "./roles";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user || !isAdmin(session.user.role)) {
    redirect("/sign-in");
  }

  return session;
}

export async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user || !isSuperAdmin(session.user.role)) {
    redirect("/admin/overview");
  }

  return session;
}