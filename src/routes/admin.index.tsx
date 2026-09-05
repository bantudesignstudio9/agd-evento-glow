import { createFileRoute } from "@tanstack/react-router";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { PACKAGES, formatKz, labelPeriodos, periodosDaReserva, valorReserva } from "@/lib/types";
import { CalendarDays, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { format, isAfter } from "date-fns";
import { pt } from "date-fns/locale";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  useStoreVersion();
  const reservas = Store.reservas();
  const pendentes = reservas.filter((r) => r.status === "Pendente");
  const pagos = reservas.filter((r) => r.status === "Pago");
  const receita = pagos.reduce((acc, r) => acc + (PACKAGES.find((p) => p.id === r.pacote_id)?.preco ?? 0), 0);
  const proximos = [...reservas]
    .filter((r) => isAfter(new Date(r.data_evento), new Date(Date.now() - 86400000)))
    .sort((a, b) => a.data_evento.localeCompare(b.data_evento))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Visão geral</div>
        <h1 className="font-display text-3xl text-navy">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Clock className="h-5 w-5" />} label="Pendentes" value={pendentes.length} tone="yellow" />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Pagas" value={pagos.length} tone="green" />
        <Stat icon={<DollarSign className="h-5 w-5" />} label="Receita" value={formatKz(receita)} tone="navy" />
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-navy" />
          <h2 className="font-display text-xl text-navy">Próximos eventos</h2>
        </div>
        {proximos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento próximo.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {proximos.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium text-foreground">{r.cliente_nome} · {r.tipo_evento}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.data_evento), "EEEE, d 'de' MMMM", { locale: pt })} · {labelPeriodos(periodosDaReserva(r))}
                  </div>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-navy">{PACKAGES.find((p) => p.id === r.pacote_id)?.nome}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: "yellow" | "green" | "navy" }) {
  const tones = {
    yellow: "from-yellow-100 to-yellow-50 text-yellow-800",
    green: "from-green-100 to-green-50 text-green-800",
    navy: "from-[color-mix(in_oklab,var(--color-primary)_20%,white)] to-white text-navy",
  } as const;
  return (
    <div className={`glass-strong rounded-2xl p-5`}>
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>{icon}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl text-navy">{value}</div>
    </div>
  );
}
