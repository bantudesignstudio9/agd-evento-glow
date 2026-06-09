import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Store } from "@/lib/store";
import {
  PACKAGES, formatKz, CAPACIDADE_ESPACO, DEFAULT_DESIGN, DEFAULT_LOCAL,
  COR_PRESETS, FONT_OPTIONS, labelTipoEvento,
  tipoEventoUsaMesas, tipoEventoUsaPoltrona, tipoEventoUsaTurma, tipoEventoUsaSessoes,
  type DesignConvite, type Reserva, type Convidado, type ConvidadoDetalhes, type Sessao,
} from "@/lib/types";
import { useStoreVersion } from "@/hooks/useStore";
import { QRCodeSVG } from "qrcode.react";
import {
  Lock, Plus, Search, Ticket, Trash2, CalendarDays,
  Users, Palette, Mail, Save, Download, Link2, CheckCircle2, Clock,
  PartyPopper, Phone, MapPin, Send, MessageCircle, Loader2,
  Upload, Sparkles, Image as ImageIcon, X, GraduationCap, ShoppingBag,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { gerarConvitePDF, copiarLinkConvite } from "@/lib/invite";
import { MapaEvento } from "@/components/MapaEvento";
import { geocode } from "@/lib/geocode";
import { mensagemConvite, whatsappLink } from "@/lib/whatsapp";
import { enviarSms } from "@/lib/sms.functions";
import { analisarTemplate } from "@/lib/template-ai.functions";
import { uploadEventAsset } from "@/lib/upload";
import { toast } from "sonner";


const search = z.object({ ref: z.string().optional() });

export const Route = createFileRoute("/dashboard")({
  validateSearch: search,
  component: Dashboard,
});

type Tab = "resumo" | "evento" | "sessoes" | "convidados" | "servicos" | "design" | "convites";

function Dashboard() {
  useStoreVersion();
  const { ref } = Route.useSearch();
  const [query, setQuery] = useState(ref ?? "");
  const reserva = useMemo(() => (query ? Store.getReservaByRef(query) : undefined), [query]);

  useEffect(() => { if (ref) setQuery(ref); }, [ref]);

  return (
    <main className="mx-auto mt-10 w-[min(1200px,95%)] pb-16">
      <div className="glass-strong rounded-3xl p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Centro do Cliente</div>
            <h1 className="font-display text-3xl text-navy md:text-4xl">Minha Reserva</h1>
          </div>
          <div className="glass-input flex items-center gap-2 rounded-xl px-3 py-2">
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
          <div className="glass-subtle mt-8 rounded-2xl border border-dashed border-white/60 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Insira a sua referência Multicaixa para aceder ao Centro de Gestão do Evento.
            </p>
            <Link to="/" className="btn-navy mt-4 inline-flex rounded-xl px-4 py-2 text-sm">
              Fazer nova reserva
            </Link>
          </div>
        )}

        {reserva && <ClientDashboard reserva={reserva} />}
      </div>
    </main>
  );
}

function ClientDashboard({ reserva }: { reserva: Reserva }) {
  useStoreVersion();
  const pkg = PACKAGES.find((p) => p.id === reserva.pacote_id)!;
  const pago = reserva.status === "Pago";
  const isOuro = pkg.id === "ouro";
  const [tab, setTab] = useState<Tab>("resumo");
  const usaSessoes = tipoEventoUsaSessoes(reserva.tipo_evento);

  type TabDef = { id: Tab; label: string; icon: React.ReactNode; locked?: boolean; ouroOnly?: boolean; show?: boolean };
  const tabs: TabDef[] = ([
    { id: "resumo", label: "Resumo", icon: <Ticket className="h-4 w-4" /> },
    { id: "evento", label: "Detalhes do Evento", icon: <CalendarDays className="h-4 w-4" />, locked: !pago },
    { id: "sessoes", label: "Sessões", icon: <GraduationCap className="h-4 w-4" />, locked: !pago, show: usaSessoes },
    { id: "convidados", label: "Convidados", icon: <Users className="h-4 w-4" />, locked: !pago },
    { id: "servicos", label: "Serviços extra", icon: <ShoppingBag className="h-4 w-4" />, locked: !pago },
    { id: "design", label: "Designer", icon: <Palette className="h-4 w-4" />, locked: !pago, ouroOnly: true },
    { id: "convites", label: "Convites", icon: <Mail className="h-4 w-4" />, locked: !pago, ouroOnly: true },
  ] satisfies TabDef[]).filter((t) => t.show !== false);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/40 pb-3">
        {tabs.map((t) => {
          const disabled = t.locked || (t.ouroOnly && !isOuro);
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() => setTab(t.id)}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                tab === t.id
                  ? "btn-navy"
                  : "text-foreground/70 hover:bg-white/60 hover:text-navy"
              } ${disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : ""}`}
              title={t.ouroOnly && !isOuro ? "Disponível no Plano Ouro" : t.locked ? "Disponível após confirmação de pagamento" : ""}
            >
              {disabled && <Lock className="h-3 w-3" />}
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "resumo" && <ResumoTab reserva={reserva} />}
        {tab === "evento" && pago && <EventoTab reserva={reserva} />}
        {tab === "sessoes" && pago && <SessoesTab reserva={reserva} />}
        {tab === "convidados" && pago && <ConvidadosTab reserva={reserva} />}
        {tab === "servicos" && pago && <ServicosTab reserva={reserva} />}
        {tab === "design" && pago && isOuro && <DesignTab reserva={reserva} />}
        {tab === "convites" && pago && isOuro && <ConvitesTab reserva={reserva} />}
      </div>
    </div>
  );
}

/* ---------------- SERVIÇOS EXTRA (marketplace) ---------------- */
function ServicosTab({ reserva }: { reserva: Reserva }) {
  useStoreVersion();
  const servicos = Store.servicosAtivos();
  const contratados = Store.servicosDaReserva(reserva.id);
  const total = contratados.reduce((a, b) => a + Number(b.subtotal), 0);
  const [catSel, setCatSel] = useState<string>("todas");
  const cats = Array.from(new Set(servicos.map((s) => s.categoria))).sort();
  const filtrados = catSel === "todas" ? servicos : servicos.filter((s) => s.categoria === catSel);

  async function adicionar(servico_id: string) {
    try { await Store.adicionarServicoReserva(reserva.id, servico_id, 1); toast.success("Adicionado"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha"); }
  }
  async function remover(id: string) {
    if (!confirm("Remover este serviço?")) return;
    await Store.removerServicoReserva(id); toast.success("Removido");
  }
  async function alterarQtd(id: string, qtd: number, precoUnit: number) {
    if (qtd < 1) return;
    await Store.atualizarServicoReserva(id, { quantidade: qtd, subtotal: qtd * precoUnit });
  }

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="font-display text-lg text-navy">Os meus serviços contratados</h3>
        {contratados.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Ainda não adicionou serviços extra.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-border/60">
              {contratados.map((rs) => {
                const sv = servicos.find((s) => s.id === rs.servico_id);
                return (
                  <li key={rs.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{sv?.nome ?? "Serviço"}</div>
                      <div className="text-xs text-muted-foreground">{sv?.categoria} · {formatKz(Number(rs.preco_unit))}/{sv?.unidade}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} value={rs.quantidade} onChange={(e) => alterarQtd(rs.id, Number(e.target.value), Number(rs.preco_unit))} className="w-16 rounded-lg border border-border bg-white px-2 py-1 text-sm" />
                      <span className="w-24 text-right font-medium">{formatKz(Number(rs.subtotal))}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${rs.estado === "confirmado" ? "bg-success/15 text-success" : rs.estado === "recusado" ? "bg-destructive/15 text-destructive" : "bg-yellow-100 text-yellow-800"}`}>{rs.estado}</span>
                      <button onClick={() => remover(rs.id)} className="rounded-md p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex justify-end border-t border-border pt-3">
              <div className="text-right">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Total serviços extra</div>
                <div className="font-display text-2xl text-navy">{formatKz(total)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="glass-strong rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg text-navy">Catálogo</h3>
          <select value={catSel} onChange={(e) => setCatSel(e.target.value)} className="rounded-xl border border-border bg-white px-3 py-1.5 text-sm">
            <option value="todas">Todas categorias</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-white/70 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.categoria}</div>
              <div className="font-medium text-navy">{s.nome}</div>
              {s.descricao && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.descricao}</p>}
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <div className="font-display text-lg text-navy">{formatKz(Number(s.preco_base))}</div>
                  <div className="text-[10px] text-muted-foreground">por {s.unidade}</div>
                </div>
                <button onClick={() => adicionar(s.id)} className="btn-gold inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"><Plus className="h-3 w-3" /> Adicionar</button>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && <p className="col-span-full p-6 text-center text-sm text-muted-foreground">Sem serviços nesta categoria.</p>}
        </div>
      </div>
    </div>
  );
}
function SessoesTab({ reserva }: { reserva: Reserva }) {
  useStoreVersion();
  const sessoes = Store.sessoesDaReserva(reserva.id);
  const convidados = Store.convidadosDaReserva(reserva.id);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState(reserva.data_evento);
  const [hi, setHi] = useState("");
  const [hf, setHf] = useState("");
  const [criando, setCriando] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !data) return;
    setCriando(true);
    try {
      await Store.criarSessao({
        reserva_id: reserva.id,
        titulo: titulo.trim(),
        data,
        hora_inicio: hi || null,
        hora_fim: hf || null,
        ordem: sessoes.length,
      });
      setTitulo(""); setHi(""); setHf("");
      toast.success("Sessão criada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setCriando(false);
    }
  }

  function gerarSemanais(qtd: number) {
    const base = new Date(reserva.data_evento);
    for (let i = 0; i < qtd; i++) {
      const d = new Date(base.getTime() + i * 7 * 86400000);
      Store.criarSessao({
        reserva_id: reserva.id,
        titulo: `Sessão ${sessoes.length + i + 1}`,
        data: format(d, "yyyy-MM-dd"),
        hora_inicio: reserva.hora_inicio ?? null,
        hora_fim: reserva.hora_fim ?? null,
        ordem: sessoes.length + i,
      });
    }
    toast.success(`${qtd} sessões criadas`);
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl text-navy">Sessões / Aulas</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Cada participante usa o mesmo QR Code para marcar presença em todas as sessões.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => gerarSemanais(4)} className="rounded-xl border border-border bg-white/70 px-3 py-2 text-xs">+4 semanais</button>
            <button onClick={() => gerarSemanais(8)} className="rounded-xl border border-border bg-white/70 px-3 py-2 text-xs">+8 semanais</button>
          </div>
        </div>

        <form onSubmit={add} className="mt-5 grid gap-2 md:grid-cols-[1.4fr_1fr_0.6fr_0.6fr_auto]">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (Ex: Módulo 1)"
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
          <input type="time" value={hi} onChange={(e) => setHi(e.target.value)} placeholder="Início"
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
          <input type="time" value={hf} onChange={(e) => setHf(e.target.value)} placeholder="Fim"
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
          <button disabled={criando}
            className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </form>
      </div>

      {sessoes.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-3 font-display text-lg text-navy">Pauta de presenças</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/40 text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-3">Sessão</th>
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Presenças</th>
                  <th className="py-2 pr-3">%</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => <SessaoRow key={s.id} s={s} total={convidados.length} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {convidados.length > 0 && sessoes.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-3 font-display text-lg text-navy">Assiduidade por participante</h3>
          <ul className="divide-y divide-white/40 text-sm">
            {convidados.map((c) => {
              const presencas = Store.presencasDoConvidado(c.id).filter((p) => sessoes.some((s) => s.id === p.sessao_id));
              const pct = sessoes.length === 0 ? 0 : Math.round((presencas.length / sessoes.length) * 100);
              const bom = pct >= 75;
              return (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span className="font-medium text-navy">{c.nome_convidado}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{presencas.length}/{sessoes.length}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${bom ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {pct}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function SessaoRow({ s, total }: { s: Sessao; total: number }) {
  const presencas = Store.presencasDaSessao(s.id);
  const pct = total === 0 ? 0 : Math.round((presencas.length / total) * 100);
  return (
    <tr className="border-b border-white/30">
      <td className="py-2 pr-3 font-medium text-navy">{s.titulo}</td>
      <td className="py-2 pr-3 text-xs">
        {format(new Date(s.data), "EEE, d MMM", { locale: pt })}
        {s.hora_inicio ? ` · ${s.hora_inicio}` : ""}
      </td>
      <td className="py-2 pr-3">{presencas.length} / {total}</td>
      <td className="py-2 pr-3">
        <span className={`rounded-full px-2 py-0.5 text-xs ${pct >= 75 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{pct}%</span>
      </td>
      <td className="py-2 text-right">
        <button onClick={() => {
          if (confirm(`Remover sessão "${s.titulo}"?`)) Store.removerSessao(s.id);
        }} className="p-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

/* ---------------- RESUMO ---------------- */
function ResumoTab({ reserva }: { reserva: Reserva }) {
  const pkg = PACKAGES.find((p) => p.id === reserva.pacote_id)!;
  const pago = reserva.status === "Pago";

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="font-display text-2xl text-navy">{pkg.nome}</div>
          <StatusBadge status={reserva.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Cliente" v={reserva.cliente_nome} />
          <Row k="E-mail" v={reserva.cliente_email} />
          <Row k="Telefone" v={reserva.cliente_telefone} />
          <Row k="Tipo de evento" v={labelTipoEvento(reserva.tipo_evento)} />
          <Row k="Data" v={format(new Date(reserva.data_evento), "d 'de' MMMM 'de' yyyy", { locale: pt })} />
          <Row k="Período" v={reserva.periodo === "manha" ? "Manhã" : "Tarde"} />
          <Row k="Valor" v={formatKz(pkg.preco)} />
        </dl>
      </div>

      {!pago ? (
        <div className="glass-dark rounded-2xl p-6">
          <Lock className="h-7 w-7 text-accent" />
          <div className="mt-3 font-display text-2xl">Aguardando confirmação de pagamento</div>
          <p className="mt-1 text-sm text-white/70">
            Use os dados abaixo para pagamento via Multicaixa Express, ATM ou Internet Banking.
            Assim que confirmarmos o pagamento, o Centro de Gestão do Evento será desbloqueado.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Stat label="Entidade" value={reserva.entidade_pagamento} />
            <Stat label="Referência" value={reserva.referencia_pagamento} />
            <Stat label="Montante" value={formatKz(pkg.preco)} />
            <Stat label="Validade" value="48h" />
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-6">
          <CheckCircle2 className="h-7 w-7 text-success" />
          <div className="mt-2 font-display text-2xl text-navy">Pagamento confirmado</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bem-vindo ao Centro de Gestão do Evento. Configure os detalhes, adicione convidados
            {pkg.permite_convites_digitais && " e personalize convites digitais com QR Code"}.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Stat label="Entidade" value={reserva.entidade_pagamento} />
            <Stat label="Referência" value={reserva.referencia_pagamento} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
      <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
      <div className="font-mono text-lg text-white">{value}</div>
    </div>
  );
}

/* ---------------- DETALHES DO EVENTO ---------------- */
function EventoTab({ reserva }: { reserva: Reserva }) {
  const [nome, setNome] = useState(reserva.evento_nome ?? "");
  const [hi, setHi] = useState(reserva.hora_inicio ?? (reserva.periodo === "manha" ? "08:00" : "13:00"));
  const [hf, setHf] = useState(reserva.hora_fim ?? (reserva.periodo === "manha" ? "12:00" : "16:00"));
  const [msg, setMsg] = useState(reserva.mensagem_boas_vindas ?? "");
  const local = reserva.local_evento ?? DEFAULT_LOCAL;
  const [endereco, setEndereco] = useState(local.endereco);
  const [lat, setLat] = useState<number | undefined>(local.lat);
  const [lng, setLng] = useState<number | undefined>(local.lng);
  const [geocoding, setGeocoding] = useState(false);
  const [saved, setSaved] = useState(false);

  async function localizarNoMapa() {
    if (!endereco.trim()) return;
    setGeocoding(true);
    const r = await geocode(endereco);
    setGeocoding(false);
    if (r) {
      setLat(r.lat); setLng(r.lng);
      toast.success("Endereço localizado no mapa");
    } else {
      toast.error("Não foi possível localizar este endereço");
    }
  }

  function salvar() {
    Store.atualizarReserva(reserva.id, {
      evento_nome: nome,
      hora_inicio: hi,
      hora_fim: hf,
      mensagem_boas_vindas: msg,
      local_evento: { endereco, lat, lng },
    });
    setSaved(true);
    toast.success("Detalhes do evento guardados");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl text-navy">Detalhes do Evento</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Estas informações serão usadas nos convites e no mapa partilhado com os convidados.
        </p>

        <div className="mt-5 space-y-4">
          <Field label="Nome do evento">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Festa da Janeth"
              className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Horário de início">
              <input type="time" value={hi} onChange={(e) => setHi(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none" />
            </Field>
            <Field label="Horário de fim">
              <input type="time" value={hf} onChange={(e) => setHf(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-sm outline-none" />
            </Field>
          </div>
          <Field label="Mensagem de boas-vindas">
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              rows={3}
              placeholder="Será uma honra contar com a sua presença..."
              className="glass-input w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
            />
          </Field>

          <Field label="Endereço do evento">
            <div className="flex gap-2">
              <div className="glass-input flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
                <MapPin className="h-4 w-4 text-accent" />
                <input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, bairro, cidade…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={localizarNoMapa}
                disabled={geocoding}
                className="btn-navy inline-flex items-center gap-2 rounded-xl px-3 text-sm disabled:opacity-50"
              >
                {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Localizar
              </button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Powered by OpenStreetMap · sem chave necessária</p>
          </Field>

          <div className="flex items-center gap-3">
            <button onClick={salvar} className="btn-gold inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium">
              <Save className="h-4 w-4" /> Guardar alterações
            </button>
            {saved && <span className="text-sm text-success">Alterações guardadas ✓</span>}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass overflow-hidden rounded-2xl p-2">
          {lat != null && lng != null ? (
            <MapaEvento lat={lat} lng={lng} label={endereco} height={260} />
          ) : (
            <div className="grid h-[260px] place-items-center rounded-2xl bg-white/40 text-center text-xs text-muted-foreground">
              Use "Localizar" para mostrar o endereço no mapa.
            </div>
          )}
          <div className="px-3 py-2 text-[11px] text-muted-foreground">
            Capacidade até 150 lugares · Seg–Sex 08h–16h · 925 788 112 / 995 788 112
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- CONVIDADOS ---------------- */
function ConvidadosTab({ reserva }: { reserva: Reserva }) {
  const lista = Store.convidadosDaReserva(reserva.id);
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const limite = reserva.max_convidados ?? CAPACIDADE_ESPACO;
  const pct = Math.min(100, Math.round((lista.length / limite) * 100));

  const usaMesas = tipoEventoUsaMesas(reserva.tipo_evento);
  const usaPoltrona = tipoEventoUsaPoltrona(reserva.tipo_evento);
  const usaTurma = tipoEventoUsaTurma(reserva.tipo_evento);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || lista.length >= limite) return;
    Store.addConvidado(reserva.id, nome.trim(), tel.trim() || undefined);
    setNome(""); setTel("");
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl text-navy">Lista de Convidados</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {labelTipoEvento(reserva.tipo_evento)} ·{" "}
              {usaMesas ? "atribua mesa e lugar a cada convidado" :
                usaPoltrona ? "atribua poltrona e área (VIP/normal)" :
                usaTurma ? "atribua turma/grupo a cada participante" :
                "edite os detalhes individuais"}.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-navy">{lista.length}<span className="text-base text-muted-foreground"> / {limite}</span></div>
            <div className="text-xs text-muted-foreground">capacidade máxima</div>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/40">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--gradient-gold)" }} />
        </div>

        <form onSubmit={add} className="mt-5 grid gap-2 md:grid-cols-[1.4fr_1fr_auto]">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do convidado"
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
          <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Telefone (opcional)"
            className="glass-input rounded-xl px-3 py-2 text-sm outline-none" />
          <button disabled={lista.length >= limite}
            className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </form>
      </div>

      <div className="glass overflow-hidden rounded-2xl">
        <div className="divide-y divide-white/30">
          {lista.map((c, i) => (
            <ConvidadoRow
              key={c.id} c={c} i={i + 1}
              usaMesas={usaMesas} usaPoltrona={usaPoltrona} usaTurma={usaTurma}
            />
          ))}
          {lista.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Ainda sem convidados. Adicione o primeiro acima.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function ConvidadoRow({
  c, i, usaMesas, usaPoltrona, usaTurma,
}: {
  c: Convidado; i: number;
  usaMesas: boolean; usaPoltrona: boolean; usaTurma: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(c.nome_convidado);
  const [tel, setTel] = useState(c.telefone ?? "");
  const [det, setDet] = useState<ConvidadoDetalhes>(c.detalhes ?? {});

  function setD<K extends keyof ConvidadoDetalhes>(k: K, v: ConvidadoDetalhes[K]) {
    setDet((d) => ({ ...d, [k]: v }));
  }

  function salvar() {
    Store.atualizarConvidado(c.id, {
      nome_convidado: nome,
      telefone: tel || undefined,
      detalhes: det,
    });
    setEditing(false);
    toast.success("Convidado atualizado");
  }

  const chips: string[] = [];
  if (c.detalhes?.mesa) chips.push(`Mesa ${c.detalhes.mesa}`);
  if (c.detalhes?.lugar) chips.push(`Lugar ${c.detalhes.lugar}`);
  if (c.detalhes?.area) chips.push(c.detalhes.area.toUpperCase());
  if (c.detalhes?.turma) chips.push(`Turma ${c.detalhes.turma}`);
  if (c.detalhes?.funcao) chips.push(c.detalhes.funcao);

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">#{i}</span>
          {editing ? (
            <input value={nome} onChange={(e) => setNome(e.target.value)}
              className="glass-input rounded-md px-2 py-1 text-sm outline-none" />
          ) : <span className="font-medium text-navy">{c.nome_convidado}</span>}
          {c.status_checkin
            ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">Presente</span>
            : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Pendente</span>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {editing ? (
            <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="Telefone"
              className="glass-input rounded-md px-2 py-1 outline-none" />
          ) : (
            <span className="flex items-center gap-1">
              {c.telefone && <Phone className="h-3 w-3" />}{c.telefone || "sem telefone"}
            </span>
          )}
          <span className="font-mono text-[10px]">{c.qr_code_hash}</span>
        </div>

        {editing ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {usaMesas && (
              <>
                <DetInput label="Mesa" value={det.mesa ?? ""} onChange={(v) => setD("mesa", v)} />
                <DetInput label="Lugar" value={det.lugar ?? ""} onChange={(v) => setD("lugar", v)} />
              </>
            )}
            {usaPoltrona && (
              <>
                <DetInput label="Poltrona" value={det.lugar ?? ""} onChange={(v) => setD("lugar", v)} />
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Área</span>
                  <select value={det.area ?? ""} onChange={(e) => setD("area", (e.target.value || undefined) as ConvidadoDetalhes["area"])}
                    className="glass-input w-full rounded-md px-2 py-1 text-sm outline-none">
                    <option value="">—</option>
                    <option value="vip">VIP</option>
                    <option value="normal">Normal</option>
                    <option value="palco">Palco</option>
                    <option value="outra">Outra</option>
                  </select>
                </label>
              </>
            )}
            {usaTurma && (
              <DetInput label="Turma / grupo" value={det.turma ?? ""} onChange={(v) => setD("turma", v)} />
            )}
            <DetInput label="Função (opcional)" value={det.funcao ?? ""} onChange={(v) => setD("funcao", v)} />
            <DetInput label="Observações" value={det.observacoes ?? ""} onChange={(v) => setD("observacoes", v)} />
          </div>
        ) : chips.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {chips.map((t) => (
              <span key={t} className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-navy">{t}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 gap-1">
        {editing ? (
          <button onClick={salvar} className="rounded-md bg-success/15 px-2 py-1 text-xs text-success">Guardar</button>
        ) : (
          <button onClick={() => setEditing(true)} className="rounded-md bg-white/60 px-2 py-1 text-xs">Editar</button>
        )}
        <button onClick={() => Store.removerConvidado(c.id)} className="rounded-md p-1 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function DetInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="glass-input w-full rounded-md px-2 py-1 text-sm outline-none" />
    </label>
  );
}


/* ---------------- DESIGNER ---------------- */
function DesignTab({ reserva }: { reserva: Reserva }) {
  const [design, setDesign] = useState<DesignConvite>(reserva.design_convite ?? DEFAULT_DESIGN);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const tplRef = useRef<HTMLInputElement>(null);
  const analisar = useServerFn(analisarTemplate);

  function up<K extends keyof DesignConvite>(k: K, v: DesignConvite[K]) {
    setDesign((d) => ({ ...d, [k]: v }));
  }
  function salvar() {
    Store.atualizarReserva(reserva.id, { design_convite: design });
    setSaved(true);
    toast.success("Design guardado");
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "bg",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const set = kind === "logo" ? setUploadingLogo : setUploadingBg;
    set(true);
    try {
      const url = await uploadEventAsset(reserva.id, kind, file);
      if (kind === "logo") up("logo_url", url);
      else up("bg_image_url", url);
      toast.success(kind === "logo" ? "Logotipo carregado" : "Imagem de fundo carregada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      set(false);
      e.target.value = "";
    }
  }

  async function handleTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalisando(true);
    try {
      const url = await uploadEventAsset(reserva.id, "template", file);
      toast.message("A analisar template com IA…");
      const r = await analisar({ data: { image_url: url } });
      if (r.ok) {
        setDesign((d) => ({
          ...d,
          bg: r.design.bg,
          accent: r.design.accent,
          fonte: r.design.fonte,
          textura: r.design.textura,
        }));
        toast.success(`Design extraído: ${r.design.estilo}`);
      } else {
        toast.error(r.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na análise");
    } finally {
      setAnalisando(false);
      e.target.value = "";
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl text-navy">Invitation Designer</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize o cartão digital — ou carregue um template e deixe a IA extrair o estilo automaticamente.
        </p>

        <div className="mt-5 space-y-5">
          {/* AI Template */}
          <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-navy">
              <Sparkles className="h-4 w-4 text-accent" />
              Análise IA de Template
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Carregue uma imagem (JPG/PNG) do convite que quer replicar e a IA extrai cores, tipografia e textura.
            </p>
            <input ref={tplRef} type="file" accept="image/*" hidden onChange={handleTemplate} />
            <button onClick={() => tplRef.current?.click()} disabled={analisando}
              className="btn-gold mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs disabled:opacity-50">
              {analisando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {analisando ? "A analisar…" : "Carregar template"}
            </button>
          </div>

          {/* Logo + BG */}
          <div className="grid grid-cols-2 gap-3">
            <UploadBox
              label="Logotipo"
              url={design.logo_url}
              uploading={uploadingLogo}
              onPick={() => logoRef.current?.click()}
              onClear={() => up("logo_url", undefined)}
            />
            <UploadBox
              label="Imagem de fundo"
              url={design.bg_image_url}
              uploading={uploadingBg}
              onPick={() => bgRef.current?.click()}
              onClear={() => up("bg_image_url", undefined)}
            />
            <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => handleUpload(e, "logo")} />
            <input ref={bgRef} type="file" accept="image/*" hidden onChange={(e) => handleUpload(e, "bg")} />
          </div>

          <Field label="Cor de fundo">
            <div className="flex flex-wrap gap-2">
              {COR_PRESETS.map((c) => (
                <button key={c} onClick={() => up("bg", c)}
                  className={`h-9 w-9 rounded-lg ring-2 transition ${design.bg === c ? "ring-accent scale-110" : "ring-white/60 hover:scale-105"}`}
                  style={{ background: c }} aria-label={c} />
              ))}
              <input type="color" value={design.bg} onChange={(e) => up("bg", e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border-0 bg-transparent" />
            </div>
          </Field>

          <Field label="Cor de destaque">
            <input type="color" value={design.accent} onChange={(e) => up("accent", e.target.value)}
              className="h-10 w-20 cursor-pointer rounded-lg border-0 bg-transparent" />
          </Field>

          <Field label="Tipografia">
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((f) => (
                <button key={f.value} onClick={() => up("fonte", f.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition ${
                    design.fonte === f.value ? "border-accent bg-accent/15" : "border-white/60 bg-white/40 hover:bg-white/60"
                  }`}
                  style={{ fontFamily: `'${f.value}', serif` }}>{f.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Textura">
            <div className="flex gap-2">
              {(["liso", "ondas", "brilho"] as const).map((t) => (
                <button key={t} onClick={() => up("textura", t)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition ${
                    design.textura === t ? "border-accent bg-accent/15" : "border-white/60 bg-white/40"
                  }`}>{t}</button>
              ))}
            </div>
          </Field>

          <label className="flex items-center gap-3 rounded-xl bg-white/40 px-3 py-2">
            <input type="checkbox" checked={!!design.animado}
              onChange={(e) => up("animado", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            <div>
              <div className="text-sm font-medium text-navy">Convite animado</div>
              <div className="text-xs text-muted-foreground">Brilho dourado, fade-in e flutuação suave ao abrir o convite.</div>
            </div>
          </label>

          <div className="flex items-center gap-3">
            <button onClick={salvar} className="btn-gold inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium">
              <Save className="h-4 w-4" /> Guardar design
            </button>
            {saved && <span className="text-sm text-success">Design guardado ✓</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Pré-visualização em tempo real</div>
        <div className="mt-3">
          <ConvitePreview reserva={reserva} design={design} convidadoNome="Nome do Convidado" hash="AGD-PREVIEW-0001" />
        </div>
      </div>
    </div>
  );
}

function UploadBox({
  label, url, uploading, onPick, onClear,
}: { label: string; url?: string; uploading: boolean; onPick: () => void; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white/40 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {url && (
          <button onClick={onClear} className="text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <button onClick={onPick} disabled={uploading}
        className="relative grid h-20 w-full place-items-center overflow-hidden rounded-lg bg-white/60 text-xs text-muted-foreground hover:bg-white">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> :
          url ? <img src={url} alt={label} className="h-full w-full object-cover" /> :
          <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Carregar</span>}
      </button>
    </div>
  );
}


/* ---------------- CONVITES ---------------- */
function ConvitesTab({ reserva }: { reserva: Reserva }) {
  const lista = Store.convidadosDaReserva(reserva.id);
  const design = reserva.design_convite ?? DEFAULT_DESIGN;
  const [copiado, setCopiado] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const sendSms = useServerFn(enviarSms);

  async function baixarTodos() {
    for (const c of lista) {
      await gerarConvitePDF(reserva, c, design);
    }
  }

  async function enviarSmsConvidado(c: Convidado) {
    if (!c.telefone) { toast.error("Convidado sem telefone"); return; }
    setEnviandoId(c.id);
    const body = `AGD Eventos · ${reserva.evento_nome || reserva.tipo_evento}\nOlá ${c.nome_convidado}, está convidado(a) em ${format(new Date(reserva.data_evento), "d/MM/yyyy")}.\nCódigo: ${c.qr_code_hash}\nConvite: ${window.location.origin}/convite?c=${c.qr_code_hash}`;
    try {
      const r = await sendSms({ data: { to: c.telefone, body } });
      if (r.ok) {
        Store.atualizarConvidado(c.id, { sms_enviado_em: new Date().toISOString() });
        toast.success(`SMS enviado para ${c.nome_convidado}`);
      } else {
        toast.error(`SMS falhou: ${r.error}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar SMS");
    } finally {
      setEnviandoId(null);
    }
  }

  function abrirWhatsapp(c: Convidado) {
    const link = whatsappLink(c.telefone, mensagemConvite(reserva, c));
    if (!link) { toast.error("Telefone inválido para WhatsApp"); return; }
    Store.atualizarConvidado(c.id, { whatsapp_enviado_em: new Date().toISOString() });
    window.open(link, "_blank");
  }

  async function enviarTodosSms() {
    const comTel = lista.filter((c) => c.telefone);
    if (!comTel.length) { toast.error("Nenhum convidado com telefone"); return; }
    toast.message(`A enviar ${comTel.length} SMS…`);
    for (const c of comTel) {
      await enviarSmsConvidado(c);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl text-navy">Convites Digitais</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Um cartão único com QR Code para cada um dos {lista.length} convidados. Envie por SMS ou WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={enviarTodosSms} disabled={lista.length === 0}
              className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
              <Send className="h-4 w-4" /> Enviar SMS a todos
            </button>
            <button onClick={baixarTodos} disabled={lista.length === 0}
              className="btn-gold inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
              <Download className="h-4 w-4" /> Baixar todos
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((c) => (
          <div key={c.id} className="flex flex-col items-center">
            <ConvitePreview reserva={reserva} design={design} convidadoNome={c.nome_convidado} hash={c.qr_code_hash} />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button onClick={() => gerarConvitePDF(reserva, c, design)} className="btn-glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                onClick={() => { copiarLinkConvite(c); setCopiado(c.id); setTimeout(() => setCopiado(null), 1500); }}
                className="btn-glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
              >
                <Link2 className="h-3.5 w-3.5" /> {copiado === c.id ? "Copiado!" : "Link"}
              </button>
              <button
                onClick={() => enviarSmsConvidado(c)}
                disabled={enviandoId === c.id || !c.telefone}
                title={c.telefone ? "Enviar SMS via Twilio" : "Sem telefone"}
                className="btn-navy inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs disabled:opacity-50"
              >
                {enviandoId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                SMS{c.sms_enviado_em ? " ✓" : ""}
              </button>
              <button
                onClick={() => abrirWhatsapp(c)}
                disabled={!c.telefone}
                title={c.telefone ? "Abrir conversa no WhatsApp" : "Sem telefone"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp{c.whatsapp_enviado_em ? " ✓" : ""}
              </button>
            </div>
          </div>
        ))}
        {lista.length === 0 && (
          <div className="glass-subtle col-span-full rounded-xl border border-dashed border-white/60 p-10 text-center text-sm text-muted-foreground">
            Adicione convidados na aba "Convidados" para gerar os convites digitais.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Convite Preview Card ---------------- */
function ConvitePreview({
  reserva, design, convidadoNome, hash,
}: { reserva: Reserva; design: DesignConvite; convidadoNome: string; hash: string }) {
  const light = isLight(design.bg);
  const txt = light ? "#171717" : "#ffffff";
  const subtle = light ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.72)";

  const texturaBg =
    design.textura === "ondas"
      ? `radial-gradient(circle at 0% 100%, ${design.accent}33, transparent 50%), radial-gradient(circle at 100% 0%, ${design.accent}22, transparent 50%), ${design.bg}`
      : design.textura === "brilho"
      ? `radial-gradient(ellipse at 50% 0%, ${design.accent}40, transparent 60%), ${design.bg}`
      : design.bg;

  const bgStyle = design.bg_image_url
    ? {
        backgroundImage: `linear-gradient(${light ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"}, ${light ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"}), url(${design.bg_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: texturaBg };

  return (
    <div
      className={`relative w-[280px] overflow-hidden rounded-2xl p-6 shadow-2xl ${design.animado ? "animate-fade-in" : ""}`}
      style={{ ...bgStyle, color: txt, fontFamily: `'${design.fonte}', serif`, aspectRatio: "0.7" }}
    >
      {design.animado && (
        <div
          className="pointer-events-none absolute -inset-1 opacity-60"
          style={{
            background: `radial-gradient(circle at 30% 20%, ${design.accent}55, transparent 50%)`,
            animation: "pulse 4s ease-in-out infinite",
          }}
        />
      )}
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: design.accent }} />
      <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: design.accent }} />
      <div className="absolute inset-3 rounded-xl border" style={{ borderColor: `${design.accent}66` }} />

      <div className="relative flex h-full flex-col items-center text-center">
        {design.logo_url ? (
          <img src={design.logo_url} alt="logo" className="mb-2 max-h-10 object-contain" />
        ) : (
          <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color: design.accent }}>AGD Eventos</div>
        )}
        <div className="mt-2 text-xl font-bold leading-tight" style={{ maxWidth: "100%" }}>
          {reserva.evento_nome || reserva.tipo_evento}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: design.accent }}>Convite Especial</div>

        <div className="mt-4 text-[11px] italic" style={{ color: subtle }}>Convidamos</div>
        <div className="mt-1 text-lg font-semibold leading-tight">{convidadoNome}</div>

        {reserva.mensagem_boas_vindas && (
          <div className="mt-3 text-[10px] italic leading-snug" style={{ color: subtle }}>
            "{reserva.mensagem_boas_vindas}"
          </div>
        )}

        <div className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: design.accent }}>
          {format(new Date(reserva.data_evento), "d MMM yyyy", { locale: pt })}
        </div>
        <div className="text-[10px]" style={{ color: subtle }}>
          {reserva.hora_inicio && reserva.hora_fim ? `${reserva.hora_inicio} — ${reserva.hora_fim}` : reserva.periodo === "manha" ? "Manhã" : "Tarde"}
        </div>

        <div className="mt-auto pt-3">
          <div className="rounded-lg bg-white p-1.5">
            <QRCodeSVG value={hash} size={80} />
          </div>
          <div className="mt-1 font-mono text-[7px]" style={{ color: subtle }}>{hash}</div>
        </div>
      </div>
    </div>
  );
}


function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160;
}

/* ---------------- Helpers ---------------- */
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
