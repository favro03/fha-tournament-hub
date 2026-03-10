import { APP_NAME } from "@/lib/constants";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-emerald-400/15 bg-[linear-gradient(180deg,rgba(2,10,8,0.96)_0%,rgba(3,18,12,0.98)_100%)] text-slate-200">
      <div className="wrapper py-5">
        <div className="flex flex-col items-center justify-center gap-1 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Faribault Falcons
          </div>
          <div className="text-sm text-slate-200">
            © {currentYear} {APP_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;