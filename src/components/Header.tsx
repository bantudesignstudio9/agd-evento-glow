import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.jpg";
import { Calendar, LayoutDashboard, ScanLine, Shield } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-4 z-40 mx-auto mt-4 w-[min(1200px,95%)]">
      <div className="glass-strong flex items-center justify-between rounded-2xl px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="AGD Eventos" className="h-10 w-auto rounded-md" />
          <div className="leading-tight">
            <div className="font-display text-lg text-navy">AGD Eventos</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Cultura · Organização · Excelência
            </div>
          </div>
        </Link>
        <nav className="hidden gap-1 md:flex">
          <NavLink to="/" icon={<Calendar className="h-4 w-4" />}>Reservar</NavLink>
          <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Minha Reserva</NavLink>
          <NavLink to="/admin" icon={<Shield className="h-4 w-4" />}>Admin</NavLink>
          <NavLink to="/admin/checkin" icon={<ScanLine className="h-4 w-4" />}>Check-in</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-foreground/80 transition hover:bg-white/60 hover:text-navy"
      activeProps={{ className: "bg-white/80 text-navy font-medium" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      {children}
    </Link>
  );
}
