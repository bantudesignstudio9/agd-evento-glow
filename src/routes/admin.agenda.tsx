import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { formatKz, type Reserva, type Period, labelPeriodos, periodosDaReserva, horasDosPeriodos, horasPeriodo, valorReserva } from "@/lib/types";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar, MapPin, Users, AlertTriangle, X, Pencil } from "lucide-react";
import { PACKAGES } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/agenda")({
  component: AdminAgenda,
});

const CORES_ESTADO: Record<string, { bg: string; bd: string }> = {
  Pendente: { bg: "#fef3c7", bd: "#d97706" },
  Pago: { bg: "#dcfce7", bd: "#16a34a" },
  Cancelado: { bg: "#fee2e2", bd: "#dc2626" },
};

function periodoToHoras(p: Period): { start: string; end: string } {
  const h = horasPeriodo(p);
  return { start: `${h.inicio}:00`, end: `${h.fim}:00` };
}

function AdminAgenda() {
  useStoreVersion();
  const reservas = Store.reservas();
  const espacos = Store.espacosAtivos();
  const [filtroEspaco, setFiltroEspaco] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [selected, setSelected] = useState<Reserva | null>(null);

  const eventos = useMemo(() => {
    return reservas
      .filter((r) => filtroEspaco === "todos" || (r.espaco_id ?? "") === filtroEspaco)
      .filter((r) => filtroEstado === "todos" || r.status === filtroEstado)
      .map((r) => {
        const h = periodoToHoras(r.periodo);
        const cor = CORES_ESTADO[r.status] ?? CORES_ESTADO.Pendente;
        return {
          id: r.id,
          title: `${r.cliente_nome} · ${r.tipo_evento}`,
          start: `${r.data_evento}T${h.start}`,
          end: `${r.data_evento}T${h.end}`,
          backgroundColor: cor.bg,
          borderColor: cor.bd,
          textColor: "#0f172a",
          extendedProps: { reserva: r },
        };
      });
  }, [reservas, filtroEspaco, filtroEstado]);

  function onClick(arg: EventClickArg) {
    const r = arg.event.extendedProps.reserva as Reserva;
    setSelected(r);
  }

  async function onDrop(arg: EventDropArg) {
    const r = arg.event.extendedProps.reserva as Reserva;
    const novaData = format(arg.event.start ?? new Date(), "yyyy-MM-dd");
    if (!confirm(`Mover "${r.cliente_nome}" para ${novaData}?`)) {
      arg.revert();
      return;
    }
    try {
      await Store.editarReservaAdmin(r.id, { data_evento: novaData }, "Movido via agenda");
      toast.success("Data actualizada");
    } catch (e) {
      arg.revert();
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Operações</div>
        <h1 className="font-display text-3xl text-navy">Agenda</h1>
        <p className="text-sm text-muted-foreground">Mapa-calendário das reservas. Arraste para mover a data.</p>
      </div>

      <div className="glass-strong flex flex-wrap items-center gap-3 rounded-2xl p-3">
        <select
          value={filtroEspaco}
          onChange={(e) => setFiltroEspaco(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="todos">Todos os espaços</option>
          {espacos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="todos">Todos os estados</option>
          <option value="Pendente">Pendentes</option>
          <option value="Pago">Pagas</option>
          <option value="Cancelado">Canceladas</option>
        </select>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <Leg cor="#fef3c7" txt="Pendente" />
          <Leg cor="#dcfce7" txt="Pago" />
          <Leg cor="#fee2e2" txt="Cancelado" />
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-3">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          locale="pt"
          buttonText={{ today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
          events={eventos}
          editable={true}
          eventClick={onClick}
          eventDrop={onDrop}
          height="auto"
          firstDay={1}
        />
      </div>

      {selected && <Drawer r={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Leg({ cor, txt }: { cor: string; txt: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-3 w-3 rounded" style={{ background: cor }} /> {txt}
    </span>
  );
}

function Drawer({ r, onClose }: { r: Reserva; onClose: () => void }) {
  const pkg = PACKAGES.find((p) => p.id === r.pacote_id);
  const convidados = Store.convidadosDaReserva(r.id).length;
  const espaco = r.espaco_id ? Store.getEspaco(r.espaco_id) : null;
  const alts = Store.alteracoesDaReserva(r.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Reserva</div>
            <h2 className="font-display text-2xl text-navy">{r.cliente_nome}</h2>
            <div className="text-xs text-muted-foreground">{r.referencia_pagamento}</div>
            {r.alteracao_urgente && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" /> Alteração urgente (&lt;48h)
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2 text-sm">
          <Row icon={<Calendar className="h-4 w-4" />}>{format(new Date(r.data_evento), "EEEE, d 'de' MMMM yyyy", { locale: pt })} · {labelPeriodos(periodosDaReserva(r))}</Row>
          <Row>Tipo: <b>{r.tipo_evento}</b></Row>
          {pkg && <Row>Pacote: <b>{pkg.nome}</b> ({formatKz(pkg.preco)})</Row>}
          {espaco && <Row icon={<MapPin className="h-4 w-4" />}>{espaco.nome}</Row>}
          <Row icon={<Users className="h-4 w-4" />}>{convidados} convidados</Row>
          <Row>Telefone: {r.cliente_telefone}</Row>
          <Row>Email: {r.cliente_email}</Row>
        </div>

        <Link
          to="/admin/reservas/$id/editar"
          params={{ id: r.id }}
          className="btn-navy mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm"
        >
          <Pencil className="h-4 w-4" /> Editar reserva
        </Link>

        {alts.length > 0 && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Histórico recente</div>
            <ul className="mt-2 space-y-2">
              {alts.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-white/60 p-2 text-xs">
                  <div className="font-medium">{a.campo}</div>
                  <div className="text-muted-foreground">{a.valor_antigo ?? "—"} → {a.valor_novo ?? "—"}</div>
                  {a.motivo && <div className="mt-1 text-muted-foreground">"{a.motivo}"</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{format(new Date(a.criado_em), "dd/MM HH:mm")} · {a.staff_nome}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 border-b border-dashed border-border/60 py-1.5">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
