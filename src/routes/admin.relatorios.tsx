import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { formatKz, getPacote, labelPeriodos, labelTipoEvento, periodosDaReserva, valorReserva } from "@/lib/types";
import { pdfEvento, pdfFinanceiro, pdfReservas } from "@/lib/reports";
import { baixarModeloReservas, exportarExcel, lerFicheiroReservas, type LinhaImportada } from "@/lib/excel";
import { AlertTriangle, CheckCircle2, Download, FileDown, FileSpreadsheet, Upload } from "lucide-react";

export const Route = createFileRoute("/admin/relatorios")({
  component: Relatorios,
  head: () => ({
    meta: [
      { title: "Relatórios e Importação · Backoffice AGD Eventos" },
      { name: "description", content: "Emita relatórios em PDF, exporte dados e importe reservas em massa por Excel." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const hoje = () => format(new Date(), "yyyy-MM-dd");
const inicioAno = () => `${new Date().getFullYear()}-01-01`;

function Relatorios() {
  useStoreVersion();
  const reservas = Store.reservas();
  const transacoes = Store.transacoes();
  const [de, setDe] = useState(inicioAno());
  const [ate, setAte] = useState(hoje());
  const [eventoId, setEventoId] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Documentos</div>
        <h1 className="font-display text-3xl text-navy">Relatórios & Importação</h1>
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <h2 className="font-display text-xl text-navy">Relatórios em PDF</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">De</span>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="inp" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="inp" />
          </label>
          <button onClick={() => pdfReservas(reservas, { de, ate })} className="btn-navy rounded-xl px-4 py-2 text-sm">
            <FileDown className="mr-1 inline h-4 w-4" /> Reservas
          </button>
          <button onClick={() => pdfFinanceiro(transacoes, { de, ate })} className="btn-navy rounded-xl px-4 py-2 text-sm">
            <FileDown className="mr-1 inline h-4 w-4" /> Financeiro
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-border/60 pt-5">
          <label className="block min-w-64 flex-1">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Relatório de um evento</span>
            <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="inp">
              <option value="">— escolher evento —</option>
              {reservas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.referencia_pagamento} · {r.cliente_nome} · {r.data_evento}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const r = reservas.find((x) => x.id === eventoId);
              if (!r) { toast.error("Escolha um evento."); return; }
              pdfEvento(r, Store.convidados(r.id));
            }}
            className="btn-navy rounded-xl px-4 py-2 text-sm"
          >
            <FileDown className="mr-1 inline h-4 w-4" /> Gerar PDF do evento
          </button>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <h2 className="font-display text-xl text-navy">Excel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Descarregue a planilha modelo para registar reservas à mão quando estiver sem internet e depois carregue-a aqui.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={baixarModeloReservas} className="glass-strong rounded-xl px-4 py-2 text-sm hover:bg-white/80">
            <Download className="mr-1 inline h-4 w-4" /> Planilha modelo
          </button>
          <button
            onClick={() => exportarExcel(`AGD-reservas-${hoje()}.xlsx`, [{
              nome: "Reservas",
              linhas: reservas.map((r) => ({
                referencia: r.referencia_pagamento,
                cliente_nome: r.cliente_nome,
                cliente_telefone: r.cliente_telefone,
                cliente_email: r.cliente_email,
                tipo_evento: labelTipoEvento(r.tipo_evento),
                evento_nome: r.evento_nome ?? "",
                data_evento: r.data_evento,
                periodos: labelPeriodos(periodosDaReserva(r)),
                plano: getPacote(r.pacote_id)?.nome ?? r.pacote_id,
                status: r.status,
                valor: valorReserva(r, getPacote(r.pacote_id)?.preco ?? 0),
              })),
            }])}
            className="glass-strong rounded-xl px-4 py-2 text-sm hover:bg-white/80"
          >
            <FileSpreadsheet className="mr-1 inline h-4 w-4" /> Exportar reservas
          </button>
        </div>
      </div>

      <Importador />
    </div>
  );
}

function Importador() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [linhas, setLinhas] = useState<LinhaImportada[] | null>(null);
  const [busy, setBusy] = useState(false);
  const validas = linhas?.filter((l) => l.ok) ?? [];

  async function escolher(file: File) {
    try {
      const res = await lerFicheiroReservas(file);
      if (res.length === 0) { toast.error("O ficheiro não tem linhas para importar."); return; }
      setLinhas(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler o ficheiro");
    }
  }

  async function importar() {
    if (validas.length === 0) return;
    setBusy(true);
    try {
      const res = await Store.importarReservas(validas.map((l) => l.payload as Record<string, unknown>));
      toast.success(`${res.criadas} reserva(s) importada(s) com sucesso.`);
      setLinhas(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na importação");
    } finally { setBusy(false); }
  }

  return (
    <div className="glass-strong rounded-3xl p-6">
      <h2 className="font-display text-xl text-navy">Importar reservas em massa</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Carregue a planilha preenchida. Verificamos cada linha antes de guardar.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void escolher(f); }}
        className="mt-4 block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:text-white"
      />

      {linhas && (
        <div className="mt-5 space-y-3">
          <div className="text-sm">
            <span className="font-medium text-green-700">{validas.length} válida(s)</span>
            {linhas.length - validas.length > 0 && (
              <span className="text-destructive"> · {linhas.length - validas.length} com erro</span>
            )}
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {linhas.map((l) => (
              <li key={l.linha} className="flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2">
                {l.ok
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                  : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                <div>
                  <div>Linha {l.linha} · {l.resumo}</div>
                  {!l.ok && <div className="text-xs text-destructive">{l.erros.join(" · ")}</div>}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button onClick={importar} disabled={busy || validas.length === 0}
              className="btn-navy rounded-xl px-4 py-2 text-sm disabled:opacity-60">
              <Upload className="mr-1 inline h-4 w-4" /> Importar {validas.length} reserva(s)
            </button>
            <button onClick={() => { setLinhas(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="rounded-xl px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Valor a pagar calculado automaticamente pelo plano e períodos ({formatKz(0).replace("0 ", "")} = Kwanza).
      </p>
    </div>
  );
}
