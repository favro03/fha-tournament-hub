"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserIcon, Shield, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UserButton = () => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <Button
        asChild
        variant="ghost"
        className="h-auto rounded-full border border-emerald-400/15 bg-white/5 px-3 py-2 text-slate-100 transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-white"
      >
        <Link href="/sign-in" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
          <UserIcon className="h-4 w-4 text-emerald-300" />
          <span>Admin</span>
        </Link>
      </Button>
    );
  }

  const firstInitial = session.user?.username?.charAt(0).toUpperCase() ?? "";

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="ml-1 h-10 w-10 rounded-full border border-emerald-400/20 bg-emerald-500/12 p-0 text-emerald-200 transition-all duration-200 hover:border-emerald-400/40 hover:bg-emerald-500/20 hover:text-white"
          >
            <span className="text-sm font-bold">{firstInitial}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          forceMount
          className="w-60 rounded-2xl border border-emerald-400/15 bg-[linear-gradient(180deg,rgba(3,18,12,0.98)_0%,rgba(6,28,18,0.96)_55%,rgba(2,10,8,0.96)_100%)] p-2 text-white shadow-2xl backdrop-blur-md"
        >
          <DropdownMenuLabel className="rounded-xl border border-emerald-400/10 bg-white/5 px-3 py-3 font-normal">
            <div className="flex flex-col space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Signed In
              </div>
              <div className="text-sm font-medium leading-none text-white">
                {session.user?.username}
              </div>
            </div>
          </DropdownMenuLabel>

          {session.user?.role === "admin" && (
            <DropdownMenuItem className="mt-2 cursor-pointer rounded-xl px-2 py-0 text-slate-100 focus:bg-emerald-500/10 focus:text-white">
              <Link
                href="/admin/overview"
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2"
              >
                <Shield className="h-4 w-4 text-emerald-300" />
                <span>Admin Page</span>
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem className="mt-1 rounded-xl p-0 text-slate-100 focus:bg-transparent">
            <Button
              type="button"
              variant="ghost"
              onClick={() => signOut()}
              className="flex h-auto w-full items-center justify-start gap-2 rounded-xl px-4 py-2 text-slate-100 transition-all duration-200 hover:bg-emerald-500/10 hover:text-white"
            >
              <LogOut className="h-4 w-4 text-emerald-300" />
              <span>Sign Out</span>
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserButton;