import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Store } from "@/lib/store";
import { PACKAGES, formatKz } from "@/lib/types";
import { useStoreVersion } from "@/hooks/useStore";
import { QRCodeSVG } from "qrcode.react";
import { Lock, Plus, Search, Sparkles, Ticket, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const search = z.object({ ref: z.string().optional() });

export const Route = createFileRoute("/dashboard")({
  validateSearch: search,
  component: Dashboard,
});

function Dashboard() {
  useStoreVersion();
  const { ref } = Route.useSearch();
  const [query, setQuery] = useState(ref ?? "");
  const reserva = useMemo(() => (query ? Store.getReservaByRef(query) : undefined), [query]);

  useEffect(() => { if (ref) setQuery(ref); }, [ref]);

  return (
    <main className="mx-auto mt-10 w-[min(1100px,95%)] pb-10">
      <div className="glass-strong rounded-3xl p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Área do Cliente</div>
            <h1 className="font-display text-3xl text-navy">Minha Reserva</h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Referência de 9 dígitos"
              className="w-56 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        {!reserva && (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-white/40 p-10 text-center">
            <p className="text-sm text-muted-foreground">Insira a sua referência Multicaixa para ver os detalhes da reserva.</p>
            <Link to="/" className="btn-navy mt-4 inline-flex rounded-xl px-4 py-2 text-sm">Fazer nova reserva</Link>
          </div>
        )}

        {reserva && <ReservaView reserva={reserva} />}
      </div>
    </main>
  );
}

function ReservaView({ reserva }: { reserva: ReturnType<typeof Store.getReserva> & object }) {
  const pkg = PACKAGES.find((p) => p.id === reserva.pacote_id)!;
  const pago = reserva.status === "Pago";
  const isOuro = pkg.id === "ouro";

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl text-navy">{pkg.nome}</div>
          <StatusBadge status={reserva.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Cliente" v={reserva.cliente_nome} />
          <Row k="E-mail" v={reserva.cliente_email} />
          <Row k="Evento" v={reserva.tipo_evento} />
          <Row k="Data" v={format(new Date(reserva.data_evento), "d 'de' MMMM 'de' yyyy", { locale: pt })} />
          <Row k="Período" v={reserva.periodo === "manha" ? "Manhã" : "Tarde"} />
          <Row k="Valor" v={formatKz(pkg.preco)} />
          <Row k="Entidade" v={reserva.entidade_pagamento} />
          <Row k="Referência" v={reserva.referencia_pagamento} />
        </dl>
      </div>

      <div>
        {!pago && (
          <div className="glass rounded-2xl p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="mt-2 font-display text-xl text-navy">Aguardando confirmação de pagamento</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Assim que o pagamento for confirmado, as funcionalidades do seu pacote serão liberadas automaticamente.
            </p>
          </div>
        )}

        {pago && !isOuro && (
          <div className="glass-dark rounded-2xl p-6">
            <Sparkles className="h-7 w-7 text-accent" />
            <div className="mt-2 font-display text-2xl text-white">Upgrade para o Plano Ouro</div>
            <p className="mt-1 text-sm text-white/70">
              Faça upgrade e tenha acesso a convites digitais com QR Code, climatização, som profissional e protocolo AGD.
            </p>
            <button className="btn-gold mt-4 rounded-xl px-4 py-2 text-sm">Solicitar upgrade</button>
          </div>
        )}

        {pago && isOuro && <Convidados reservaId={reserva.id} />}
      </div>
    </div>
  );
}

function Convidados({ reservaId }: { reservaId: string }) {
  useStoreVersion();
  const [nome, setNome] = useState("");
  const lista = Store.convidadosDaReserva(reservaId);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Plano Ouro</div>
          <h2 className="font-display text-2xl text-navy">Gestão de Convidados</h2>
        </div>
        <div className="rounded-full bg-accent/20 px-3 py-1 text-xs text-navy">{lista.length} convidado(s)</div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (nome.trim()) { Store.addConvidado(reservaId, nome.trim()); setNome(""); } }}
        className="mt-4 flex gap-2"
      >
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do convidado"
          className="flex-1 rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none"
        />
        <button className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"><Plus className="h-4 w-4" /> Adicionar</button>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {lista.map((c) => (
          <div key={c.id} className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[var(--shadow-glass)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Bilhete Digital</div>
                <div className="font-display text-lg text-navy">{c.nome_convidado}</div>
              </div>
              <button onClick={() => Store.removerConvidado(c.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><Ticket className="h-3 w-3" /> AGD Eventos</div>
                <div className="mt-1 break-all font-mono">{c.qr_code_hash}</div>
                {c.status_checkin && <div className="mt-2 inline-block rounded-full bg-success/15 px-2 py-0.5 text-success">Check-in feito</div>}
              </div>
              <div className="rounded-lg bg-white p-2 ring-1 ring-border">
                <QRCodeSVG value={c.qr_code_hash} size={84} />
              </div>
            </div>
            <div className="pointer-events-none absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
            <div className="pointer-events-none absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background" />
          </div>
        ))}
        {lista.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ainda sem convidados. Adicione o primeiro acima.
          </div>
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
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${map[status]}`}>{status}</span>;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-border/60 py-2 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}
