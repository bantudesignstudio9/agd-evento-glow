import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import {
  CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, METODOS_FINANCEIROS, formatKz,
  getPacote, valorReserva, type Plano, type TipoTransacao, type Transacao,
} from "@/lib/types";
import { pdfFinanceiro } from "@/lib/reports";
import { exportarExcel } from "@/lib/excel";
import { ArrowDownCircle, ArrowUpCircle, FileDown, Plus, Save, Sheet, Trash2, Wallet } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/financeiro")({
  component: Financeiro,
  head: () => ({
    meta: [
      { title: "Gestão Financeira · Backoffice AGD Eventos" },
      { name: "description", content: "Controlo de receitas, despesas e planos de preços dos eventos AGD." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const hoje = () => format(new Date(), "yyyy-MM-dd");
const inicioMes = () => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

function Financeiro() {
  useStoreVersion();
  const [aba, setAba] = useState<"movimentos" | "planos">("movimentos");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Financeiro</div>
          <h1 className="font-display text-3xl text-navy">Gestão financeira</h1>
        </div>
        <div className="flex gap-2">
          {(["movimentos", "planos"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setAba(t)}
              className={`rounded-xl px-4 py-2 text-sm capitalize transition ${aba === t ? "btn-navy" : "glass-strong hover:bg-white/80"}`}
            >
              {t === "movimentos" ? "Receitas & Despesas" : "Planos"}
            </button>
          ))}
        </div>
      </div>
      {aba === "movimentos" ? <Movimentos /> : <Planos />}
    </div>
  );
}

function Movimentos() {
  const transacoes = Store.transacoes();
  const reservas = Store.reservas();
  const [de, setDe] = useState(inicioMes());
  const [ate, setAte] = useState(hoje());
  const [filtro, setFiltro] = useState<"todos" | TipoTransacao>("todos");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    tipo: "despesa" as TipoTransacao,
    categoria: CATEGORIAS_DESPESA[0] as string,
    descricao: "",
    valor: "",
    data: hoje(),
    metodo: METODOS_FINANCEIROS[0] as string,
    reserva_id: "",
  });

  const lista = useMemo(
    () => transacoes
      .filter((t) => t.data >= de && t.data <= ate)
      .filter((t) => filtro === "todos" || t.tipo === filtro)
      .sort((a, b) => b.data.localeCompare(a.data)),
    [transacoes, de, ate, filtro],
  );

  const receitas = lista.filter((t) => t.tipo === "receita").reduce((a, t) => a + Number(t.valor), 0);
  const despesas = lista.filter((t) => t.tipo === "despesa").reduce((a, t) => a + Number(t.valor), 0);
  const porReceber = reservas
    .filter((r) => r.status === "Pendente")
    .reduce((a, r) => a + valorReserva(r, getPacote(r.pacote_id)?.preco ?? 0), 0);

  async function registar(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(String(form.valor).replace(/[^\d.,-]/g, "").replace(",", "."));
    if (!form.descricao.trim() || !Number.isFinite(valor) || valor <= 0) {
      toast.error("Indique a descrição e um valor válido.");
      return;
    }
    setBusy(true);
    try {
      await Store.criarTransacao({
        tipo: form.tipo,
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        valor,
        data: form.data,
        metodo: form.metodo,
        reserva_id: form.reserva_id || null,
        notas: null,
      });
      setForm({ ...form, descricao: "", valor: "" });
      toast.success("Movimento registado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao registar");
    } finally {
      setBusy(false);
    }
  }

  async function apagar(t: Transacao) {
    if (!confirm(`Apagar "${t.descricao}"?`)) return;
    try { await Store.removerTransacao(t.id); toast.success("Movimento removido"); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Falha ao remover"); }
  }

  const categorias = form.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card icon={<ArrowUpCircle className="h-5 w-5 text-green-700" />} label="Receitas" value={formatKz(receitas)} />
        <Card icon={<ArrowDownCircle className="h-5 w-5 text-red-700" />} label="Despesas" value={formatKz(despesas)} />
        <Card icon={<Wallet className="h-5 w-5 text-navy" />} label="Saldo" value={formatKz(receitas - despesas)} />
        <Card icon={<Wallet className="h-5 w-5 text-amber-700" />} label="Por receber" value={formatKz(porReceber)} />
      </div>

      <form onSubmit={registar} className="glass-strong grid gap-3 rounded-3xl p-6 md:grid-cols-6">
        <div className="md:col-span-6 font-display text-lg text-navy">Registar movimento</div>
        <Select label="Tipo" value={form.tipo}
          onChange={(v) => setForm({ ...form, tipo: v as TipoTransacao, categoria: (v === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA)[0] })}
          options={[{ v: "despesa", l: "Despesa" }, { v: "receita", l: "Receita" }]} />
        <Select label="Categoria" value={form.categoria} onChange={(v) => setForm({ ...form, categoria: v })}
          options={categorias.map((c) => ({ v: c, l: c }))} />
        <Field label="Descrição" className="md:col-span-2">
          <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            className="inp" placeholder="Ex.: Pagamento de catering" />
        </Field>
        <Field label="Valor (Kz)">
          <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
            inputMode="decimal" className="inp" placeholder="150000" />
        </Field>
        <Field label="Data">
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="inp" />
        </Field>
        <Select label="Método" value={form.metodo} onChange={(v) => setForm({ ...form, metodo: v })}
          options={METODOS_FINANCEIROS.map((m) => ({ v: m, l: m }))} />
        <Select label="Evento (opcional)" value={form.reserva_id} onChange={(v) => setForm({ ...form, reserva_id: v })}
          className="md:col-span-3"
          options={[{ v: "", l: "— sem evento —" }, ...reservas.map((r) => ({ v: r.id, l: `${r.referencia_pagamento} · ${r.cliente_nome}` }))]} />
        <div className="flex items-end md:col-span-2">
          <button disabled={busy} className="btn-navy w-full rounded-xl py-2 text-sm disabled:opacity-60">
            <Plus className="mr-1 inline h-4 w-4" /> Registar
          </button>
        </div>
      </form>

      <div className="glass-strong rounded-3xl p-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Field label="De"><input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="inp" /></Field>
          <Field label="Até"><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="inp" /></Field>
          <Select label="Mostrar" value={filtro} onChange={(v) => setFiltro(v as typeof filtro)}
            options={[{ v: "todos", l: "Tudo" }, { v: "receita", l: "Receitas" }, { v: "despesa", l: "Despesas" }]} />
          <div className="ml-auto flex gap-2">
            <button onClick={() => pdfFinanceiro(lista, { de, ate })} className="btn-navy rounded-xl px-4 py-2 text-sm">
              <FileDown className="mr-1 inline h-4 w-4" /> PDF
            </button>
            <button
              onClick={() => exportarExcel(`AGD-financeiro-${de}_${ate}.xlsx`, [{
                nome: "Movimentos",
                linhas: lista.map((t) => ({
                  data: t.data, tipo: t.tipo, categoria: t.categoria,
                  descricao: t.descricao, metodo: t.metodo ?? "", valor: Number(t.valor),
                })),
              }])}
              className="glass-strong rounded-xl px-4 py-2 text-sm hover:bg-white/80"
            >
              <Sheet className="mr-1 inline h-4 w-4" /> Excel
            </button>
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentos neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr><th className="py-2">Data</th><th>Descrição</th><th>Categoria</th><th>Método</th><th className="text-right">Valor</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {lista.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 whitespace-nowrap">{t.data}</td>
                    <td className="pr-3">{t.descricao}</td>
                    <td className="pr-3 text-muted-foreground">{t.categoria}</td>
                    <td className="pr-3 text-muted-foreground">{t.metodo ?? "—"}</td>
                    <td className={`whitespace-nowrap text-right font-medium ${t.tipo === "receita" ? "text-green-700" : "text-red-700"}`}>
                      {t.tipo === "receita" ? "+" : "-"}{formatKz(Number(t.valor))}
                    </td>
                    <td className="pl-3 text-right">
                      <button onClick={() => apagar(t)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Planos() {
  const planos = Store.planos();
  const [novo, setNovo] = useState(false);
  const vazio: Plano = { id: "", nome: "", preco: 0, descricao: [], permite_convites_digitais: false, activo: true, ordem: planos.length + 1 };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setNovo(true)} className="btn-navy rounded-xl px-4 py-2 text-sm">
          <Plus className="mr-1 inline h-4 w-4" /> Novo plano
        </button>
      </div>
      {novo && <PlanoForm key="novo" inicial={vazio} criar onDone={() => setNovo(false)} />}
      {planos.length === 0 && !novo && <p className="text-sm text-muted-foreground">Ainda não há planos definidos.</p>}
      {planos.sort((a, b) => a.ordem - b.ordem).map((p) => <PlanoForm key={p.id} inicial={p} />)}
    </div>
  );
}

function PlanoForm({ inicial, criar, onDone }: { inicial: Plano; criar?: boolean; onDone?: () => void }) {
  const [f, setF] = useState<Plano>({ ...inicial, descricao: inicial.descricao ?? [] });
  const [busy, setBusy] = useState(false);

  async function guardar() {
    const id = (f.id || f.nome).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!f.nome.trim() || !id) { toast.error("Indique o nome do plano."); return; }
    setBusy(true);
    try {
      await Store.guardarPlano({ ...f, id, preco: Number(f.preco) || 0 });
      toast.success("Plano guardado");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao guardar plano");
    } finally { setBusy(false); }
  }

  async function apagar() {
    if (!confirm(`Apagar o ${f.nome}? Reservas antigas mantêm o valor já cobrado.`)) return;
    try { await Store.removerPlano(f.id); toast.success("Plano removido"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao remover"); }
  }

  return (
    <div className="glass-strong grid gap-3 rounded-3xl p-6 md:grid-cols-6">
      <Field label="Nome" className="md:col-span-2">
        <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className="inp" placeholder="Plano Diamante" />
      </Field>
      <Field label="Preço por período (Kz)">
        <input value={String(f.preco)} inputMode="numeric"
          onChange={(e) => setF({ ...f, preco: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="inp" />
      </Field>
      <Field label="Ordem">
        <input value={String(f.ordem)} inputMode="numeric"
          onChange={(e) => setF({ ...f, ordem: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="inp" />
      </Field>
      <div className="flex items-end gap-4 md:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} /> Activo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.permite_convites_digitais}
            onChange={(e) => setF({ ...f, permite_convites_digitais: e.target.checked })} /> Convites digitais
        </label>
      </div>
      <Field label="Itens incluídos (um por linha)" className="md:col-span-6">
        <textarea
          value={(f.descricao ?? []).join("\n")}
          onChange={(e) => setF({ ...f, descricao: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          rows={4} className="inp" placeholder={"Espaço completo\nProtocolo AGD"} />
      </Field>
      <div className="flex gap-2 md:col-span-6">
        <button onClick={guardar} disabled={busy} className="btn-navy rounded-xl px-4 py-2 text-sm disabled:opacity-60">
          <Save className="mr-1 inline h-4 w-4" /> Guardar
        </button>
        {!criar && (
          <button onClick={apagar} className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:text-destructive">
            <Trash2 className="mr-1 inline h-4 w-4" /> Apagar
          </button>
        )}
        {criar && <button onClick={() => onDone?.()} className="rounded-xl px-4 py-2 text-sm text-muted-foreground">Cancelar</button>}
      </div>
    </div>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="mb-2">{icon}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl text-navy">{value}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({ label, value, onChange, options, className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[]; className?: string;
}) {
  return (
    <Field label={label} className={className}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="inp">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </Field>
  );
}
