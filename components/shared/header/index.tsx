import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Menu from "./menu";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-400/15 bg-[linear-gradient(90deg,rgba(3,18,12,0.96)_0%,rgba(6,28,18,0.94)_52%,rgba(2,10,8,0.92)_100%)] backdrop-blur-md">
      <div className="wrapper flex items-center justify-between py-3">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative overflow-hidden rounded-2xl ring-1 ring-emerald-400/20">
              <Image
                src="/images/logo.png"
                alt={`${APP_NAME} logo`}
                height={60}
                width={60}
                priority
                className="h-[52px] w-[52px] object-contain bg-white/5"
              />
            </div>

            <div className="hidden lg:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Faribault Falcons
              </div>
              <span className="block text-2xl font-bold text-white">
                {APP_NAME}
              </span>
            </div>
          </Link>
        </div>

        <Menu />
      </div>
    </header>
  );
};

export default Header;