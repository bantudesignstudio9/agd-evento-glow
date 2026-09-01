import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { PACKAGES, formatKz, type Reserva, type PackageId, type Period } from "@/lib/types";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CheckCircle2, Plus, Trash2, X, XCircle, Pencil, Save, MessageCircle } from "lucide-react";
import { whatsappLink, mensagemCodigoEvento } from "@/lib/whatsapp";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reservas")({
  component: AdminReservas,
});

function AdminReservas() {
  useStoreVersion();
  const reservas = [...Store.reservas()].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "Pendente" | "Pago" | "Cancelado">("todos");
  const selected = reservas.find((r) => r.id === selectedId);
  const filtradas = filtro === "todos" ? reservas : reservas.filter((r) => r.status === filtro);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="glass-strong rounded-3xl p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-navy">Gestão de Reservas</h1>
            <p className="text-sm text-muted-foreground">{reservas.length} reservas no total</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as typeof filtro)}
              className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm"
            >
              <option value="todos">Todos os estados</option>
              <option value="Pendente">Pendentes</option>
              <option value="Pago">Pagas</option>
              <option value="Cancelado">Canceladas</option>
            </select>
            <button onClick={() => setCreating(true)} className="btn-navy inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
              <Plus className="h-4 w-4" /> Nova Reserva
            </button>
          </div>
        </div>

        <div className="mt-4 -mx-4 overflow-x-auto md:mx-0 md:overflow-hidden md:rounded-2xl md:border md:border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/70 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Cliente</th><th className="p-3">Data</th><th className="p-3">Pacote</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.id} onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer border-t border-border/60 transition hover:bg-white/60 ${selectedId === r.id ? "bg-white/80" : "bg-white/30"}`}>
                  <td className="p-3"><div className="font-medium">{r.cliente_nome}</div><div className="text-xs text-muted-foreground">{r.cliente_email}</div></td>
                  <td className="p-3">{format(new Date(r.data_evento), "dd/MM/yyyy", { locale: pt })}<div className="text-xs text-muted-foreground">{labelPeriodo(r.periodo)}</div></td>
                  <td className="p-3">{PACKAGES.find((p) => p.id === r.pacote_id)?.nome}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sem reservas neste filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="glass-strong h-fit rounded-3xl p-6">
        {!selected && <p className="text-sm text-muted-foreground">Selecione uma reserva para ver detalhes ou crie uma nova.</p>}
        {selected && <DetalheReserva r={selected} onClose={() => setSelectedId(null)} />}
      </aside>

      {creating && <NovaReservaModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function DetalheReserva({ r, onClose }: { r: Reserva; onClose: () => void }) {
  const pkg = PACKAGES.find((p) => p.id === r.pacote_id)!;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    cliente_nome: r.cliente_nome,
    cliente_email: r.cliente_email,
    cliente_telefone: r.cliente_telefone,
    tipo_evento: r.tipo_evento,
    data_evento: r.data_evento,
    periodo: r.periodo,
    pacote_id: r.pacote_id,
  });

  async function salvar() {
    await Store.atualizarReserva(r.id, form);
    toast.success("Reserva atualizada");
    setEditing(false);
  }
  async function eliminar() {
    if (!confirm(`Eliminar definitivamente a reserva de ${r.cliente_nome}?`)) return;
    await Store.removerReserva(r.id);
    toast.success("Reserva eliminada");
    onClose();
  }


  const waCodigo = whatsappLink(
    r.cliente_telefone,
    mensagemCodigoEvento(r, typeof window !== "undefined" ? window.location.origin : ""),
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Reserva</div>
          <div className="font-display text-xl text-navy">{r.cliente_nome}</div>
          <div className="text-xs text-muted-foreground">{r.referencia_pagamento}</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Inp label="Nome" v={form.cliente_nome} on={(v) => setForm({ ...form, cliente_nome: v })} />
          <Inp label="Email" v={form.cliente_email} on={(v) => setForm({ ...form, cliente_email: v })} />
          <Inp label="Telefone" v={form.cliente_telefone} on={(v) => setForm({ ...form, cliente_telefone: v })} />
          <Inp label="Tipo de evento" v={form.tipo_evento} on={(v) => setForm({ ...form, tipo_evento: v })} />
          <Inp label="Data" type="date" v={form.data_evento} on={(v) => setForm({ ...form, data_evento: v })} />
          <Sel label="Período" v={form.periodo} on={(v) => setForm({ ...form, periodo: v as Period })}
               opts={PERIODOS.map((p) => ({ v: p.value, l: p.label }))} />
          <Sel label="Pacote" v={form.pacote_id} on={(v) => setForm({ ...form, pacote_id: v as PackageId })}
               opts={PACKAGES.map((p) => ({ v: p.id, l: p.nome }))} />
        </div>
      ) : (
        <>
          <Row k="E-mail" v={r.cliente_email} />
          <Row k="Telefone" v={r.cliente_telefone} />
          <Row k="Evento" v={r.tipo_evento} />
          <Row k="Pacote" v={`${pkg.nome} (${formatKz(pkg.preco)})`} />
          <Row k="Data" v={format(new Date(r.data_evento), "d 'de' MMMM 'de' yyyy", { locale: pt })} />
          <Row k="Período" v={labelPeriodo(r.periodo)} />
          <Row k="Pagamento" v={r.metodo_pagamento === "express" ? "Multicaixa Express" : r.metodo_pagamento === "iban" ? "Transferência (IBAN)" : "—"} />
          <Row k="Comprovativo" v={r.comprovativo_url
            ? <a href={r.comprovativo_url} target="_blank" rel="noreferrer" className="text-navy underline">Ver ficheiro</a>
            : <span className="text-muted-foreground">Em falta</span>} />
          <Row k="Status" v={<StatusBadge status={r.status} />} />
        </>
      )}

      <div className="space-y-2 pt-2">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={salvar} className="btn-navy inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm">
              <Save className="h-4 w-4" /> Guardar
            </button>
            <button onClick={() => setEditing(false)} className="rounded-xl border border-border bg-white/70 px-3 py-2 text-sm">Cancelar</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-white/70 px-3 py-2 text-sm">
              <Pencil className="h-4 w-4" /> Edição rápida
            </button>
            <Link to="/admin/reservas/$id/editar" params={{ id: r.id }} className="btn-navy inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm">
              Edição completa
            </Link>
          </div>
        )}

        <a
          href={waCodigo ?? "#"}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => { if (!waCodigo) { e.preventDefault(); toast.error("Telefone do cliente inválido"); } }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2 text-sm text-success"
        >
          <MessageCircle className="h-4 w-4" /> Enviar código por WhatsApp
        </a>

        {r.status === "Pendente" && (
          <button onClick={() => Store.atualizarStatus(r.id, "Pago")} className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" /> Confirmar Pagamento
          </button>
        )}
        {r.status === "Pago" && (
          <button onClick={() => Store.atualizarStatus(r.id, "Pendente")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm">
            Reverter para Pendente
          </button>
        )}
        {r.status !== "Cancelado" && (
          <button onClick={() => Store.atualizarStatus(r.id, "Cancelado")} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" /> Cancelar Reserva
          </button>
        )}
        <button onClick={eliminar} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-white px-4 py-2 text-sm text-destructive hover:bg-destructive/5">
          <Trash2 className="h-4 w-4" /> Eliminar permanentemente
        </button>
      </div>
    </div>
  );
}

function NovaReservaModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    cliente_nome: "", cliente_email: "", cliente_telefone: "",
    tipo_evento: "", pacote_id: "prata" as PackageId,
    data_evento: format(new Date(), "yyyy-MM-dd"),
    periodo: "manha" as Period,
  });
  const [busy, setBusy] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_nome || !form.cliente_email || !form.cliente_telefone || !form.tipo_evento) {
      toast.error("Preencha todos os campos");
      return;
    }
    setBusy(true);
    try {
      const r = await Store.criarReserva(form);
      toast.success(`Reserva criada · Ref: ${r.referencia_pagamento}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={criar} className="glass-strong w-full max-w-lg rounded-2xl bg-white/95 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-navy">Nova Reserva (manual)</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Inp label="Nome do cliente" v={form.cliente_nome} on={(v) => setForm({ ...form, cliente_nome: v })} />
          <Inp label="E-mail" v={form.cliente_email} on={(v) => setForm({ ...form, cliente_email: v })} />
          <Inp label="Telefone" v={form.cliente_telefone} on={(v) => setForm({ ...form, cliente_telefone: v })} />
          <Inp label="Tipo de evento" v={form.tipo_evento} on={(v) => setForm({ ...form, tipo_evento: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Inp label="Data" type="date" v={form.data_evento} on={(v) => setForm({ ...form, data_evento: v })} />
            <Sel label="Período" v={form.periodo} on={(v) => setForm({ ...form, periodo: v as Period })}
                 opts={PERIODOS.map((p) => ({ v: p.value, l: p.label }))} />
          </div>
          <Sel label="Pacote" v={form.pacote_id} on={(v) => setForm({ ...form, pacote_id: v as PackageId })}
               opts={PACKAGES.map((p) => ({ v: p.id, l: `${p.nome} · ${formatKz(p.preco)}` }))} />
        </div>
        <button disabled={busy} className="btn-gold mt-5 w-full rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
          {busy ? "A criar…" : "Criar reserva"}
        </button>
      </form>
    </div>
  );
}

function Inp({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none" />
    </label>
  );
}
function Sel({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={v} onChange={(e) => on(e.target.value)} className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none">
        {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
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
