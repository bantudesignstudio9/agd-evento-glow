import * as XLSX from "xlsx";
import {
  PACKAGES, TIPOS_EVENTO, PERIODOS, calcularPreco, getPacote,
  horasDosPeriodos, ordenarPeriodos, type Period,
} from "./types";

export const COLUNAS_MODELO = [
  "cliente_nome",
  "cliente_email",
  "cliente_telefone",
  "tipo_evento",
  "evento_nome",
  "plano",
  "data_evento",
  "periodos",
  "max_convidados",
  "status",
] as const;

function baixar(wb: XLSX.WorkBook, nome: string) {
  XLSX.writeFile(wb, nome, { bookType: "xlsx" });
}

/** Planilha modelo para registo manual (offline) de reservas. */
export function baixarModeloReservas() {
  const exemplo = [
    {
      cliente_nome: "Maria Domingos",
      cliente_email: "maria@exemplo.ao",
      cliente_telefone: "923000000",
      tipo_evento: "casamento",
      evento_nome: "Casamento Maria & João",
      plano: "ouro",
      data_evento: "2026-10-24",
      periodos: "tarde;noite",
      max_convidados: 120,
      status: "Pendente",
    },
  ];
  const wsDados = XLSX.utils.json_to_sheet(exemplo, { header: [...COLUNAS_MODELO] });
  wsDados["!cols"] = COLUNAS_MODELO.map(() => ({ wch: 22 }));

  const instrucoes = [
    ["AGD Eventos — Modelo de registo manual de reservas"],
    [],
    ["1. Preencha uma linha por reserva na folha \"Reservas\"."],
    ["2. Não altere os nomes das colunas nem apague a primeira linha."],
    ["3. A linha de exemplo pode ser substituída ou apagada."],
    ["4. Depois carregue este ficheiro em Backoffice → Relatórios → Importar Excel."],
    [],
    ["Coluna", "Obrigatório", "Formato / valores aceites"],
    ["cliente_nome", "Sim", "Texto"],
    ["cliente_email", "Não", "email@dominio.ao"],
    ["cliente_telefone", "Sim", "9xxxxxxxx"],
    ["tipo_evento", "Sim", "Ver folha \"Referências\""],
    ["evento_nome", "Não", "Texto"],
    ["plano", "Sim", PACKAGES.map((p) => p.id).join(" | ")],
    ["data_evento", "Sim", "AAAA-MM-DD (ex.: 2026-10-24)"],
    ["periodos", "Sim", "manha | tarde | noite (separar com ;)"],
    ["max_convidados", "Não", "Número"],
    ["status", "Não", "Pendente | Pago | Cancelado (por omissão: Pendente)"],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instrucoes);
  wsInfo["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 60 }];

  const refs: (string | number)[][] = [["tipo_evento", "descrição", "", "plano", "preço (Kz)", "", "período", "horário"]];
  const maxLin = Math.max(TIPOS_EVENTO.length, PACKAGES.length, PERIODOS.length);
  for (let i = 0; i < maxLin; i++) {
    refs.push([
      TIPOS_EVENTO[i]?.value ?? "", TIPOS_EVENTO[i]?.label ?? "", "",
      PACKAGES[i]?.id ?? "", PACKAGES[i]?.preco ?? "", "",
      PERIODOS[i]?.value ?? "", PERIODOS[i]?.hint ?? "",
    ]);
  }
  const wsRefs = XLSX.utils.aoa_to_sheet(refs);
  wsRefs["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 3 }, { wch: 12 }, { wch: 12 }, { wch: 3 }, { wch: 10 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDados, "Reservas");
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instruções");
  XLSX.utils.book_append_sheet(wb, wsRefs, "Referências");
  baixar(wb, "AGD-modelo-reservas.xlsx");
}

export interface LinhaImportada {
  linha: number;
  ok: boolean;
  erros: string[];
  payload?: Record<string, unknown>;
  resumo: string;
}

function normalizarData(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Lê um ficheiro Excel/CSV e valida cada linha antes da importação. */
export async function lerFicheiroReservas(file: File): Promise<LinhaImportada[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const nomeFolha = wb.SheetNames.find((n) => n.toLowerCase().startsWith("reserva")) ?? wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[nomeFolha], { defval: "" });

  return rows.map((raw, i) => {
    const get = (k: string) => {
      const key = Object.keys(raw).find((x) => x.trim().toLowerCase() === k);
      return key ? String(raw[key] ?? "").trim() : "";
    };
    const erros: string[] = [];
    const nome = get("cliente_nome");
    const telefone = get("cliente_telefone");
    const tipo = get("tipo_evento") || "outro";
    const planoId = (get("plano") || "prata").toLowerCase();
    const data = normalizarData(
      Object.keys(raw).find((x) => x.trim().toLowerCase() === "data_evento")
        ? raw[Object.keys(raw).find((x) => x.trim().toLowerCase() === "data_evento")!]
        : "",
    );
    const periodos = ordenarPeriodos(
      get("periodos").split(/[;,/|]/).map((p) => p.trim().toLowerCase())
        .filter((p): p is Period => PERIODOS.some((x) => x.value === p)),
    );
    const pkg = getPacote(planoId);

    if (!nome) erros.push("nome do cliente em falta");
    if (!telefone) erros.push("telefone em falta");
    if (!data) erros.push("data inválida (use AAAA-MM-DD)");
    if (periodos.length === 0) erros.push("período inválido (manha, tarde ou noite)");
    if (!pkg) erros.push(`plano "${planoId}" não existe`);

    if (erros.length > 0 || !data || !pkg) {
      return { linha: i + 2, ok: false, erros, resumo: nome || `Linha ${i + 2}` };
    }

    const horas = horasDosPeriodos(periodos);
    const statusRaw = get("status").toLowerCase();
    const status = statusRaw === "pago" ? "Pago" : statusRaw === "cancelado" ? "Cancelado" : "Pendente";
    const maxConv = Number(get("max_convidados"));

    return {
      linha: i + 2,
      ok: true,
      erros: [],
      resumo: `${nome} · ${data} · ${periodos.join(" + ")}`,
      payload: {
        cliente_nome: nome,
        cliente_email: get("cliente_email") || "",
        cliente_telefone: telefone,
        tipo_evento: tipo,
        evento_nome: get("evento_nome") || null,
        pacote_id: pkg.id,
        data_evento: data,
        periodo: periodos[0],
        periodos,
        hora_inicio: horas.inicio,
        hora_fim: horas.fim,
        max_convidados: Number.isFinite(maxConv) && maxConv > 0 ? Math.round(maxConv) : null,
        status,
        valor_total: calcularPreco(pkg.preco, periodos).total,
      },
    };
  });
}

/** Exporta qualquer tabela para Excel. */
export function exportarExcel(nomeFicheiro: string, folhas: { nome: string; linhas: Record<string, unknown>[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const f of folhas) {
    const ws = XLSX.utils.json_to_sheet(f.linhas.length > 0 ? f.linhas : [{}]);
    const cols = Object.keys(f.linhas[0] ?? {});
    ws["!cols"] = cols.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, f.nome.slice(0, 30));
  }
  baixar(wb, nomeFicheiro);
}
