import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { PACKAGES, TIPOS_EVENTO, formatKz, PERIODOS, type Period, type PackageId } from "@/lib/types";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { ArrowLeft, AlertTriangle, Save, History, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reservas/$id/editar")({
  component: EditarReserva,
});

type FormState = {
  cliente_nome: string; cliente_email: string; cliente_telefone: string;
  tipo_evento: string; pacote_id: string; data_evento: string; periodo: string;
  hora_inicio: string; hora_fim: string; evento_nome: string;
  mensagem_boas_vindas: string; max_convidados: number; espaco_id: string;
};

function EditarReserva() {
  useStoreVersion();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const r = Store.getReserva(id);
  const espacos = Store.espacosAtivos();
  const alts = Store.alteracoesDaReserva(id);

  const [form, setForm] = useState<FormState | null>(null);
  const [motivo, setMotivo] = useState("");
  const [notificar, setNotificar] = useState(true);
  const [busy, setBusy] = useState(false);

  // Garante hidratação (ex.: refresh directo neste URL) e dados frescos do servidor
  useEffect(() => { void Store.ready().then(() => Store.refresh()); }, []);

  // Preenche o formulário assim que a reserva estiver disponível
  useEffect(() => {
    if (!r || form) return;
    setForm({
      cliente_nome: r.cliente_nome,
      cliente_email: r.cliente_email,
      cliente_telefone: r.cliente_telefone,
      tipo_evento: r.tipo_evento,
      pacote_id: r.pacote_id,
      data_evento: r.data_evento,
      periodo: r.periodo,
      hora_inicio: r.hora_inicio ?? "",
      hora_fim: r.hora_fim ?? "",
      evento_nome: r.evento_nome ?? "",
      mensagem_boas_vindas: r.mensagem_boas_vindas ?? "",
      max_convidados: r.max_convidados ?? 0,
      espaco_id: r.espaco_id ?? "",
    });
  }, [r, form]);

  if (!r || !form) {
    return (
      <div className="glass-strong rounded-3xl p-8 text-center text-muted-foreground">
        {Store.initialized() && !r ? "Reserva não encontrada." : "A carregar reserva…"}
      </div>
    );
  }


  const eventoEm = new Date(r.data_evento + "T12:00:00").getTime();
  const horasAteEvento = (eventoEm - Date.now()) / 36e5;
  const aviso48h = horasAteEvento < 48 && horasAteEvento > 0;

  // Detecta conflitos com outras reservas no mesmo espaço/data/período
  const dataMudou = form.data_evento !== r.data_evento;
  const periodoMudou = form.periodo !== r.periodo;
  const espacoMudou = (form.espaco_id || null) !== (r.espaco_id ?? null);
  const conflito = (dataMudou || periodoMudou || espacoMudou) && Store.reservas().some((x) =>
    x.id !== r.id && x.status !== "Cancelado" && x.data_evento === form.data_evento && x.periodo === form.periodo && (x.espaco_id ?? null) === (form.espaco_id || null)
  );

  async function salvar() {
    if (!form) return;
    if (!motivo.trim()) { toast.error("Indique o motivo da alteração"); return; }
    if (conflito && !confirm("Existe conflito com outra reserva neste espaço/período. Continuar?")) return;
    setBusy(true);
    try {
      const patch = {
        ...form,
        espaco_id: form.espaco_id || null,
        max_convidados: Number(form.max_convidados) || 0,
      };
      await Store.editarReservaAdmin(id, patch, motivo, "Admin");
      if (notificar) {
        // TODO: ligar a um serverFn de SMS/email quando definirmos o template
        console.log("[admin-edit] notificar cliente:", r?.cliente_telefone, motivo);
      }
      toast.success("Reserva actualizada");
      navigate({ to: "/admin/reservas" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate({ to: "/admin/reservas" })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Editar reserva</div>
            <h1 className="font-display text-2xl text-navy">{r.cliente_nome}</h1>
            <div className="text-xs text-muted-foreground">Ref: {r.referencia_pagamento}</div>
          </div>
          {aviso48h && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" /> Evento dentro de 48h
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <F label="Nome do cliente"><input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} className="inp" /></F>
          <F label="Telefone"><input value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} className="inp" /></F>
          <F label="Email"><input value={form.cliente_email} onChange={(e) => setForm({ ...form, cliente_email: e.target.value })} className="inp" /></F>
          <F label="Nome do evento"><input value={form.evento_nome} onChange={(e) => setForm({ ...form, evento_nome: e.target.value })} className="inp" /></F>
          <F label="Tipo de evento">
            <select value={form.tipo_evento} onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })} className="inp">
              {TIPOS_EVENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </F>
          <F label="Pacote">
            <select value={form.pacote_id} onChange={(e) => setForm({ ...form, pacote_id: e.target.value as PackageId })} className="inp">
              {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.nome} · {formatKz(p.preco)}</option>)}
            </select>
          </F>
          <F label="Data"><input type="date" value={form.data_evento} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} className="inp" /></F>
          <F label="Período">
            <select value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value as Period })} className="inp">
              {PERIODOS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </F>
          <F label="Hora início"><input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="inp" /></F>
          <F label="Hora fim"><input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} className="inp" /></F>
          <F label="Espaço">
            <select value={form.espaco_id} onChange={(e) => setForm({ ...form, espaco_id: e.target.value })} className="inp">
              <option value="">— predefinido —</option>
              {espacos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </F>
          <F label="Máx. convidados"><input type="number" min={0} value={form.max_convidados} onChange={(e) => setForm({ ...form, max_convidados: Number(e.target.value) })} className="inp" /></F>
          <F label="Mensagem boas-vindas" full><textarea value={form.mensagem_boas_vindas} onChange={(e) => setForm({ ...form, mensagem_boas_vindas: e.target.value })} className="inp min-h-[60px]" /></F>
        </div>

        {conflito && (
          <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            ⚠️ Conflito: já existe outra reserva neste espaço, data e período.
          </div>
        )}

        <div className="mt-5 space-y-3 rounded-2xl border border-dashed border-border bg-white/60 p-4">
          <F label="Motivo da alteração (obrigatório)" full>
            <textarea required value={motivo} onChange={(e) => setMotivo(e.target.value)} className="inp min-h-[60px]" placeholder="Ex.: cliente pediu mudança de data por motivo X" />
          </F>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} />
            <Bell className="h-3.5 w-3.5" /> Notificar cliente por SMS/email
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={salvar} disabled={busy || !motivo.trim()} className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            <Save className="h-4 w-4" /> {busy ? "A guardar…" : "Guardar alterações"}
          </button>
          <button onClick={() => navigate({ to: "/admin/reservas" })} className="rounded-xl border border-border bg-white px-4 py-2 text-sm">Cancelar</button>
        </div>
        <style>{`.inp{width:100%;border:1px solid var(--color-border);background:#fff;border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}`}</style>
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center gap-2"><History className="h-5 w-5 text-navy" /><h2 className="font-display text-xl text-navy">Histórico de alterações</h2></div>
        {alts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Sem alterações registadas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {alts.map((a) => (
              <li key={a.id} className="py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.campo}</span>
                  {a.urgente && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">Urgente</span>}
                </div>
                <div className="text-xs text-muted-foreground">{a.valor_antigo ?? "—"} → {a.valor_novo ?? "—"}</div>
                {a.motivo && <div className="mt-1 text-xs italic text-muted-foreground">"{a.motivo}"</div>}
                <div className="mt-1 text-[10px] text-muted-foreground">{format(new Date(a.criado_em), "dd/MM/yyyy HH:mm", { locale: pt })} · {a.staff_nome ?? "—"}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
