import { Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/logo.jpg";
import { Calendar, LayoutDashboard, Menu, Shield, X } from "lucide-react";

const PUBLIC_LINKS = [
  { to: "/", label: "Reservar", icon: Calendar, exact: true },
  { to: "/dashboard", label: "Gerir Evento", icon: LayoutDashboard, exact: false },
  { to: "/admin", label: "Admin", icon: Shield, exact: false },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-2 z-40 mx-auto mt-2 w-[min(1200px,95%)] sm:top-4 sm:mt-4">
      <div className="glass-strong flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3">
        <Link to="/" className="flex items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
          <img src={logo} alt="AGD Eventos" className="h-9 w-auto rounded-md sm:h-10" />
          <div className="leading-tight">
            <div className="font-display text-base text-navy sm:text-lg">AGD Eventos</div>
            <div className="hidden text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Cultura · Organização · Excelência
            </div>
          </div>
        </Link>

        <nav className="hidden gap-1 md:flex">
          {PUBLIC_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} exact={l.exact} icon={<l.icon className="h-4 w-4" />}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          aria-label="Abrir menu"
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl bg-white/70 text-navy md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="glass-strong mt-2 rounded-2xl p-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {PUBLIC_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-foreground/80 hover:bg-white/70 hover:text-navy"
                activeProps={{ className: "bg-white/80 text-navy font-medium" }}
                activeOptions={{ exact: l.exact }}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  to, icon, children, exact,
}: { to: string; icon: React.ReactNode; children: React.ReactNode; exact: boolean }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground/80 transition hover:bg-white/60 hover:text-navy"
      activeProps={{ className: "bg-white/80 text-navy font-medium" }}
      activeOptions={{ exact }}
    >
      {icon}
      {children}
    </Link>
  );
}
