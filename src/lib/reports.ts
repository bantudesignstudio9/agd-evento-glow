import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { Convidado, Reserva, Transacao } from "./types";
import {
  formatKz, getPacote, labelPeriodos, labelTipoEvento, periodosDaReserva, valorReserva,
} from "./types";

const NAVY: [number, number, number] = [15, 23, 42];
const GOLD: [number, number, number] = [212, 168, 76];

function novoDoc(titulo: string, subtitulo: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("AGD Eventos", 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("Cultura, Organização e Excelência", 40, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(titulo, w - 40, 34, { align: "right" });
  doc.setFontSize(8);
  doc.text(subtitulo, w - 40, 50, { align: "right" });
  doc.setTextColor(0, 0, 0);
  return doc;
}

function rodape(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Emitido em ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })}`, 40, h - 24);
    doc.text(`Página ${i}/${total}`, w - 40, h - 24, { align: "right" });
  }
}

function tabela(doc: jsPDF, head: string[], body: (string | number)[][], startY: number) {
  autoTable(doc, {
    head: [head],
    body,
    startY,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 5, lineColor: [225, 225, 225] },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    margin: { left: 40, right: 40 },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function kpis(doc: jsPDF, itens: { label: string; valor: string }[], y: number) {
  const w = doc.internal.pageSize.getWidth();
  const larg = (w - 80 - (itens.length - 1) * 10) / itens.length;
  itens.forEach((it, i) => {
    const x = 40 + i * (larg + 10);
    doc.setFillColor(246, 247, 250);
    doc.roundedRect(x, y, larg, 52, 6, 6, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(it.label.toUpperCase(), x + 10, y + 18);
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.text(it.valor, x + 10, y + 38);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
  });
  return y + 52;
}

const dataCurta = (d: string) => {
  try { return format(new Date(d + (d.length === 10 ? "T12:00:00" : "")), "dd/MM/yyyy"); } catch { return d; }
};

/** Relatório de reservas (opcionalmente filtrado por intervalo de datas). */
export function pdfReservas(reservas: Reserva[], periodo?: { de?: string; ate?: string }) {
  const lista = reservas
    .filter((r) => (!periodo?.de || r.data_evento >= periodo.de) && (!periodo?.ate || r.data_evento <= periodo.ate))
    .sort((a, b) => a.data_evento.localeCompare(b.data_evento));

  const sub = periodo?.de || periodo?.ate
    ? `${periodo?.de ? dataCurta(periodo.de) : "início"} — ${periodo?.ate ? dataCurta(periodo.ate) : "hoje"}`
    : "Todas as reservas";
  const doc = novoDoc("Relatório de Reservas", sub);

  const receita = lista.filter((r) => r.status === "Pago")
    .reduce((a, r) => a + valorReserva(r, getPacote(r.pacote_id)?.preco ?? 0), 0);
  let y = kpis(doc, [
    { label: "Reservas", valor: String(lista.length) },
    { label: "Pagas", valor: String(lista.filter((r) => r.status === "Pago").length) },
    { label: "Pendentes", valor: String(lista.filter((r) => r.status === "Pendente").length) },
    { label: "Receita confirmada", valor: formatKz(receita) },
  ], 96);

  tabela(doc,
    ["Referência", "Cliente", "Evento", "Data", "Período", "Plano", "Estado", "Valor"],
    lista.map((r) => [
      r.referencia_pagamento,
      r.cliente_nome,
      r.evento_nome || labelTipoEvento(r.tipo_evento),
      dataCurta(r.data_evento),
      labelPeriodos(periodosDaReserva(r)),
      getPacote(r.pacote_id)?.nome ?? r.pacote_id,
      r.status,
      formatKz(valorReserva(r, getPacote(r.pacote_id)?.preco ?? 0)),
    ]),
    y + 20,
  );
  rodape(doc);
  doc.save(`AGD-relatorio-reservas-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/** Relatório financeiro: receitas, despesas, saldo e detalhe por categoria. */
export function pdfFinanceiro(transacoes: Transacao[], periodo?: { de?: string; ate?: string }) {
  const lista = transacoes
    .filter((t) => (!periodo?.de || t.data >= periodo.de) && (!periodo?.ate || t.data <= periodo.ate))
    .sort((a, b) => b.data.localeCompare(a.data));

  const receitas = lista.filter((t) => t.tipo === "receita").reduce((a, t) => a + Number(t.valor), 0);
  const despesas = lista.filter((t) => t.tipo === "despesa").reduce((a, t) => a + Number(t.valor), 0);

  const sub = periodo?.de || periodo?.ate
    ? `${periodo?.de ? dataCurta(periodo.de) : "início"} — ${periodo?.ate ? dataCurta(periodo.ate) : "hoje"}`
    : "Todo o histórico";
  const doc = novoDoc("Relatório Financeiro", sub);

  let y = kpis(doc, [
    { label: "Receitas", valor: formatKz(receitas) },
    { label: "Despesas", valor: formatKz(despesas) },
    { label: "Saldo", valor: formatKz(receitas - despesas) },
    { label: "Movimentos", valor: String(lista.length) },
  ], 96);

  const porCategoria = new Map<string, { r: number; d: number }>();
  for (const t of lista) {
    const acc = porCategoria.get(t.categoria) ?? { r: 0, d: 0 };
    if (t.tipo === "receita") acc.r += Number(t.valor); else acc.d += Number(t.valor);
    porCategoria.set(t.categoria, acc);
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo por categoria", 40, y + 34);
  doc.setFont("helvetica", "normal");
  y = tabela(doc, ["Categoria", "Receitas", "Despesas", "Saldo"],
    [...porCategoria.entries()].map(([c, v]) => [c, formatKz(v.r), formatKz(v.d), formatKz(v.r - v.d)]),
    y + 44);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Movimentos", 40, y + 30);
  doc.setFont("helvetica", "normal");
  tabela(doc, ["Data", "Tipo", "Categoria", "Descrição", "Método", "Valor"],
    lista.map((t) => [
      dataCurta(t.data),
      t.tipo === "receita" ? "Receita" : "Despesa",
      t.categoria,
      t.descricao,
      t.metodo ?? "—",
      `${t.tipo === "despesa" ? "-" : "+"}${formatKz(Number(t.valor))}`,
    ]),
    y + 40);

  rodape(doc);
  doc.save(`AGD-relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/** Relatório de um evento: dados, convidados, RSVP e check-in. */
export function pdfEvento(reserva: Reserva, convidados: Convidado[]) {
  const doc = novoDoc("Relatório do Evento", reserva.referencia_pagamento);
  const presentes = convidados.filter((c) => c.status_checkin).length;
  const confirmados = convidados.filter((c) => c.rsvp_status === "confirmado").length;

  let y = kpis(doc, [
    { label: "Convidados", valor: String(convidados.length) },
    { label: "Confirmados", valor: String(confirmados) },
    { label: "Presentes", valor: String(presentes) },
    { label: "Valor", valor: formatKz(valorReserva(reserva, getPacote(reserva.pacote_id)?.preco ?? 0)) },
  ], 96);

  y = tabela(doc, ["Campo", "Detalhe"], [
    ["Cliente", reserva.cliente_nome],
    ["Contacto", `${reserva.cliente_telefone}${reserva.cliente_email ? ` · ${reserva.cliente_email}` : ""}`],
    ["Evento", reserva.evento_nome || labelTipoEvento(reserva.tipo_evento)],
    ["Tipo", labelTipoEvento(reserva.tipo_evento)],
    ["Data", dataCurta(reserva.data_evento)],
    ["Período", labelPeriodos(periodosDaReserva(reserva))],
    ["Plano", getPacote(reserva.pacote_id)?.nome ?? reserva.pacote_id],
    ["Estado", reserva.status],
  ], y + 24);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Lista de convidados", 40, y + 30);
  doc.setFont("helvetica", "normal");
  tabela(doc, ["#", "Nome", "Telefone", "RSVP", "Check-in"],
    convidados.map((c, i) => [
      i + 1, c.nome_convidado, c.telefone ?? "—",
      c.rsvp_status ?? "pendente", c.status_checkin ? "Sim" : "Não",
    ]),
    y + 40);

  rodape(doc);
  doc.save(`AGD-evento-${reserva.referencia_pagamento}.pdf`);
}
