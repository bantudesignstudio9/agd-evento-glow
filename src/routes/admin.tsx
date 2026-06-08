import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { Building2, LayoutDashboard, ListChecks, LogOut, ScanLine, Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  useStoreVersion();
  const [mounted, setMounted] = useState(false);
  const [auth, setAuth] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => { setMounted(true); setAuth(Store.isAdmin()); }, []);

  if (!mounted) {
    return <main className="mx-auto mt-16 w-[min(420px,95%)]"><div className="glass-strong h-64 animate-pulse rounded-3xl" /></main>;
  }

  if (!auth) {
    return (
      <main className="mx-auto mt-16 w-[min(420px,95%)]">
        <div className="glass-strong rounded-3xl p-8 text-center">
          <Shield className="mx-auto h-10 w-10 text-navy" />
          <h1 className="mt-3 font-display text-2xl text-navy">Backoffice AGD</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso restrito ao staff.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (Store.loginAdmin(pwd)) setAuth(true);
              else setErr("Palavra-passe inválida");
            }}
            className="mt-6"
          >
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Palavra-passe"
              className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none"
            />
            {err && <div className="mt-2 text-xs text-destructive">{err}</div>}
            <button className="btn-navy mt-4 w-full rounded-xl py-2 text-sm">Entrar</button>
            <p className="mt-3 text-[11px] text-muted-foreground">Dica para demo: <code>agd2026</code></p>
          </form>
        </div>
      </main>
    );
  }

  const items = [
    { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, exact: true },
    { to: "/admin/reservas", label: "Reservas", icon: <ListChecks className="h-4 w-4" /> },
    { to: "/admin/espacos", label: "Espaços", icon: <Building2 className="h-4 w-4" /> },
    { to: "/admin/checkin", label: "Check-in", icon: <ScanLine className="h-4 w-4" /> },
  ];

  return (
    <main className="mx-auto mt-10 w-[min(1200px,95%)] pb-10">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="glass-strong h-fit rounded-3xl p-3">
          <div className="px-3 pt-2 text-[11px] uppercase tracking-widest text-muted-foreground">Backoffice</div>
          <nav className="mt-2 flex flex-col gap-1">
            {items.map((it) => {
              const active = it.exact ? path === it.to : path.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition
                    ${active ? "bg-navy text-primary-foreground" : "hover:bg-white/70"}`}
                >
                  {it.icon} {it.label}
                </Link>
              );
            })}
            <button
              onClick={() => { Store.logoutAdmin(); setAuth(false); }}
              className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </nav>
        </aside>
        <section><Outlet /></section>
      </div>
    </main>
  );
}
