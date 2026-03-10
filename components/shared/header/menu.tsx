import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  EllipsisVertical,
  UserIcon,
  BedSingle,
  Utensils,
  NotebookText,
  Network,
  House,
  BarChart3,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import UserButton from "./user-button";

const desktopButtonClass =
  "h-auto rounded-full border border-emerald-400/15 bg-white/5 px-3 py-2 text-slate-100 transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-white";

const mediumButtonClass =
  "rounded-full border border-emerald-400/15 bg-white/5 p-2 text-slate-100 transition-all duration-200 hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-white";

const mobileItemClass =
  "w-full justify-start rounded-xl border border-emerald-400/10 bg-white/5 text-slate-100 hover:bg-emerald-500/10 hover:text-white";

const Menu = () => {
  return (
    <div className="flex justify-end gap-1">
      {/* Large screen */}
      <nav className="hidden lg:flex items-center gap-2">
        <Button asChild variant="ghost" className={desktopButtonClass}>
          <Link href="/" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <House className="h-4 w-4 text-emerald-300" />
            <span>Home</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className={desktopButtonClass}>
          <Link href="/brackets" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Network className="h-4 w-4 text-emerald-300" />
            <span>Brackets</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className={desktopButtonClass}>
          <Link href="/standings" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <BarChart3 className="h-4 w-4 text-emerald-300" />
            <span>Standings</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className={desktopButtonClass}>
          <Link href="/restaurants" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Utensils className="h-4 w-4 text-emerald-300" />
            <span>Restaurants</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className={desktopButtonClass}>
          <Link href="/hotels" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <BedSingle className="h-4 w-4 text-emerald-300" />
            <span>Hotels</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" className={desktopButtonClass}>
          <Link href="/rules" className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <NotebookText className="h-4 w-4 text-emerald-300" />
            <span>Rules</span>
          </Link>
        </Button>

        <UserButton />
      </nav>

      {/* Medium screen */}
      <nav className="hidden md:flex lg:hidden items-center gap-2">
        <Button asChild variant="ghost" size="sm" className={mediumButtonClass}>
          <Link href="/" className="flex items-center">
            <House className="h-4 w-4 text-emerald-300" />
            <span className="sr-only">Home</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" size="sm" className={mediumButtonClass}>
          <Link href="/brackets" className="flex items-center">
            <Network className="h-4 w-4 text-emerald-300" />
            <span className="sr-only">Brackets</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" size="sm" className={mediumButtonClass}>
          <Link href="/standings" className="flex items-center">
            <BarChart3 className="h-4 w-4 text-emerald-300" />
            <span className="sr-only">Standings</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" size="sm" className={mediumButtonClass}>
          <Link href="/restaurants" className="flex items-center">
            <Utensils className="h-4 w-4 text-emerald-300" />
            <span className="sr-only">Restaurants</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" size="sm" className={mediumButtonClass}>
          <Link href="/hotels" className="flex items-center">
            <BedSingle className="h-4 w-4 text-emerald-300" />
            <span className="sr-only">Hotels</span>
          </Link>
        </Button>

        <Button asChild variant="ghost" size="sm" className={mediumButtonClass}>
          <Link href="/rules" className="flex items-center">
            <NotebookText className="h-4 w-4 text-emerald-300" />
            <span className="sr-only">Rules</span>
          </Link>
        </Button>

        <UserButton />
      </nav>

      {/* Mobile navigation */}
      <nav className="md:hidden">
        <Sheet>
          <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/15 bg-white/5 text-slate-100 transition hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-white">
            <EllipsisVertical className="h-5 w-5" />
          </SheetTrigger>

          <SheetContent className="border-l border-emerald-400/15 bg-[linear-gradient(180deg,rgba(3,18,12,0.98)_0%,rgba(6,28,18,0.96)_55%,rgba(2,10,8,0.96)_100%)] text-white">
            <SheetTitle className="text-left text-lg font-bold text-white">
              Menu
            </SheetTitle>

            <div className="mt-6 flex flex-col gap-3">
              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/" className="flex items-center gap-2">
                  <House className="h-4 w-4 text-emerald-300" />
                  <span>Home</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/brackets" className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-emerald-300" />
                  <span>Brackets</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/standings" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-300" />
                  <span>Standings</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/restaurants" className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-emerald-300" />
                  <span>Restaurants</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/hotels" className="flex items-center gap-2">
                  <BedSingle className="h-4 w-4 text-emerald-300" />
                  <span>Hotels</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/rules" className="flex items-center gap-2">
                  <NotebookText className="h-4 w-4 text-emerald-300" />
                  <span>Rules</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" className={mobileItemClass}>
                <Link href="/sign-in" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-emerald-300" />
                  <span>Admin</span>
                </Link>
              </Button>
            </div>

            <SheetDescription className="sr-only">
              Site navigation menu
            </SheetDescription>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
};

export default Menu;