import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { PACKAGES, formatKz, type Reserva } from "@/lib/types";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/reservas")({
  component: AdminReservas,
});

function AdminReservas() {
  useStoreVersion();
  const reservas = [...Store.reservas()].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reservas.find((r) => r.id === selectedId);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="glass-strong rounded-3xl p-6">
        <h1 className="font-display text-2xl text-navy">Gestão de Reservas</h1>
        <p className="text-sm text-muted-foreground">{reservas.length} reservas no total</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-white/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Cliente</th><th className="p-3">Data</th><th className="p-3">Pacote</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {reservas.map((r) => (
                <tr key={r.id} onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer border-t border-border/60 transition hover:bg-white/60 ${selectedId === r.id ? "bg-white/80" : "bg-white/30"}`}>
                  <td className="p-3"><div className="font-medium">{r.cliente_nome}</div><div className="text-xs text-muted-foreground">{r.cliente_email}</div></td>
                  <td className="p-3">{format(new Date(r.data_evento), "dd/MM/yyyy", { locale: pt })}<div className="text-xs text-muted-foreground">{r.periodo === "manha" ? "Manhã" : "Tarde"}</div></td>
                  <td className="p-3">{PACKAGES.find((p) => p.id === r.pacote_id)?.nome}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {reservas.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sem reservas ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="glass-strong h-fit rounded-3xl p-6">
        {!selected && <p className="text-sm text-muted-foreground">Selecione uma reserva para ver detalhes.</p>}
        {selected && <DetalheReserva r={selected} />}
      </aside>
    </div>
  );
}

function DetalheReserva({ r }: { r: Reserva }) {
  const pkg = PACKAGES.find((p) => p.id === r.pacote_id)!;
  return (
    <div className="space-y-3">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Reserva</div>
        <div className="font-display text-xl text-navy">{r.cliente_nome}</div>
        <div className="text-xs text-muted-foreground">{r.cliente_email} · {r.cliente_telefone}</div>
      </div>
      <Row k="Evento" v={r.tipo_evento} />
      <Row k="Pacote" v={`${pkg.nome} (${formatKz(pkg.preco)})`} />
      <Row k="Data" v={format(new Date(r.data_evento), "d 'de' MMMM 'de' yyyy", { locale: pt })} />
      <Row k="Período" v={r.periodo === "manha" ? "Manhã" : "Tarde"} />
      <Row k="Entidade" v={r.entidade_pagamento} />
      <Row k="Referência" v={r.referencia_pagamento} />
      <Row k="Status" v={<StatusBadge status={r.status} />} />

      <div className="pt-2">
        {r.status === "Pendente" && (
          <button
            onClick={() => Store.atualizarStatus(r.id, "Pago")}
            className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <CheckCircle2 className="h-4 w-4" /> Confirmar Pagamento Manual
          </button>
        )}
        {r.status === "Pago" && (
          <button
            onClick={() => Store.atualizarStatus(r.id, "Pendente")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm"
          >
            Reverter para Pendente
          </button>
        )}
        {r.status !== "Cancelado" && (
          <button
            onClick={() => Store.atualizarStatus(r.id, "Cancelado")}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive"
          >
            <XCircle className="h-4 w-4" /> Cancelar Reserva
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pendente: "bg-yellow-100 text-yellow-800",
    Pago: "bg-success/15 text-success",
    Cancelado: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-border/60 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
