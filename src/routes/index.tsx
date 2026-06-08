import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PACKAGES, type PackageId, type Period, formatKz, TIPOS_EVENTO, CAPACIDADE_ESPACO } from "@/lib/types";
import { Store, initStore } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { Check, ChevronLeft, ChevronRight, Sparkles, Sun, Sunset, CalendarDays, User, Mail, Phone, PartyPopper, Copy, Users, Building2 } from "lucide-react";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, isBefore, isSameDay, isSameMonth, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { pt } from "date-fns/locale";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AGD Eventos · Reserve o seu evento" },
      { name: "description", content: "Pacotes Prata e Ouro para o seu evento em Angola. Reserve em 4 passos." },
    ],
  }),
  component: Index,
});

type Step = 1 | 2 | 3 | 4;

function Index() {
  useStoreVersion();
  useEffect(() => { initStore(); }, []);
  const [step, setStep] = useState<Step>(1);
  const [pacote, setPacote] = useState<PackageId | null>(null);
  const [data, setData] = useState<Date | null>(null);
  const [periodo, setPeriodo] = useState<Period | null>(null);
  const espacosAtivos = Store.espacosAtivos();
  const [espacoId, setEspacoId] = useState<string>("");
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", tipo_evento: "", tipo_evento_outro: "", max_convidados: "" });
  const [reservaCriada, setReservaCriada] = useState<Awaited<ReturnType<typeof Store.criarReserva>> | null>(null);
  const [criando, setCriando] = useState(false);

  // Pré-selecciona o primeiro espaço se ainda nenhum
  useEffect(() => {
    if (!espacoId && espacosAtivos[0]) setEspacoId(espacosAtivos[0].id);
  }, [espacoId, espacosAtivos]);

  const navigate = useNavigate();

  const tipoFinal = form.tipo_evento === "outro" ? form.tipo_evento_outro.trim() : form.tipo_evento;

  const podeAvancar =
    (step === 1 && pacote) ||
    (step === 2 && data && periodo) ||
    (step === 3 && form.nome && form.email && form.telefone && tipoFinal);

  async function finalizar() {
    if (!pacote || !data || !periodo || criando || !tipoFinal) return;
    setCriando(true);
    try {
      const maxC = parseInt(form.max_convidados, 10);
      const r = await Store.criarReserva({
        cliente_nome: form.nome,
        cliente_email: form.email,
        cliente_telefone: form.telefone,
        tipo_evento: tipoFinal,
        pacote_id: pacote,
        data_evento: format(data, "yyyy-MM-dd"),
        periodo,
        espaco_id: espacoId || null,
        max_convidados: Number.isFinite(maxC) && maxC > 0 ? Math.min(maxC, CAPACIDADE_ESPACO) : undefined,
      });
      setReservaCriada(r);
      setStep(4);
    } finally {
      setCriando(false);
    }
  }

  return (
    <main className="mx-auto mt-10 w-[min(1200px,95%)] pb-10">
      {/* HERO */}
      {step === 1 && (
        <section className="mb-10 grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-foreground/70">Reservas para 2026 já abertas</span>
            </div>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] text-navy md:text-6xl">
              O seu evento <span className="italic text-accent">memorável</span>,<br />organizado com excelência.
            </h1>
            <p className="mt-4 max-w-xl text-foreground/70">
              AGD Eventos oferece espaço, decoração, protocolo e convites digitais para casamentos, aniversários e cerimónias corporativas em todo o território angolano.
            </p>
            <div className="mt-6 flex items-center gap-3 text-sm text-foreground/60">
              <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-success" /> Pagamento Multicaixa</span>
              <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-success" /> QR Code para convidados</span>
            </div>
          </div>
          <div className="glass-strong rounded-3xl p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Reserva expresso</div>
            <div className="mt-2 font-display text-2xl text-navy">4 passos · 2 minutos</div>
            <ol className="mt-4 space-y-2 text-sm">
              {["Escolha o pacote", "Escolha data e período", "Preencha os dados", "Receba a referência Multicaixa"].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-[11px] text-primary-foreground">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* WIZARD */}
      <div className="glass-strong rounded-3xl p-6 md:p-10">
        <Stepper step={step} />

        {step === 1 && <StepPacotes pacote={pacote} setPacote={setPacote} />}
        {step === 2 && (
          <div className="space-y-4">
            {espacosAtivos.length > 1 && (
              <div className="glass rounded-2xl p-4">
                <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <Building2 className="h-3 w-3" /> Espaço pretendido
                </label>
                <select
                  value={espacoId}
                  onChange={(e) => { setEspacoId(e.target.value); setData(null); setPeriodo(null); }}
                  className="w-full rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none"
                >
                  {espacosAtivos.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome} — cap. {e.capacidade} ({e.endereco.split(",")[0]})</option>
                  ))}
                </select>
              </div>
            )}
            <StepCalendario
              data={data}
              setData={setData}
              periodo={periodo}
              setPeriodo={setPeriodo}
              espacoId={espacoId || null}
            />
          </div>
        )}
        {step === 3 && <StepDetalhes form={form} setForm={setForm} />}
        {step === 4 && reservaCriada && <StepCheckout reserva={reservaCriada} onIr={() => navigate({ to: "/dashboard", search: { ref: reservaCriada.referencia_pagamento } as any })} />}

        {step !== 4 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
              disabled={step === 1}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
            {step < 3 ? (
              <button
                disabled={!podeAvancar}
                onClick={() => setStep((s) => (s + 1) as Step)}
                className="btn-navy inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm disabled:opacity-40"
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                disabled={!podeAvancar}
                onClick={finalizar}
                className="btn-gold inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-40"
              >
                Gerar referência <Sparkles className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Pacote", "Data & Período", "Detalhes", "Pagamento"];
  return (
    <div className="mb-8 grid grid-cols-4 gap-2">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={l} className="flex flex-col items-center gap-2">
            <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-medium transition
              ${done ? "bg-success text-success-foreground" : active ? "bg-navy text-primary-foreground" : "bg-white/70 text-muted-foreground border border-border"}`}>
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <div className={`text-[11px] uppercase tracking-wider ${active ? "text-navy" : "text-muted-foreground"}`}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

function StepPacotes({ pacote, setPacote }: { pacote: PackageId | null; setPacote: (p: PackageId) => void }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {PACKAGES.map((p) => {
        const isOuro = p.id === "ouro";
        const selected = pacote === p.id;
        return (
          <button
            key={p.id}
            onClick={() => setPacote(p.id)}
            className={`group relative overflow-hidden rounded-3xl p-6 text-left transition
              ${selected ? "ring-2 ring-accent shadow-[var(--shadow-elegant)]" : "ring-1 ring-border hover:-translate-y-1"}
              ${isOuro ? "glass-dark" : "glass"}`}
          >
            {isOuro && (
              <div className="absolute right-4 top-4 rounded-full bg-[var(--gradient-gold)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-navy">
                Mais Popular
              </div>
            )}
            <div className={`text-xs uppercase tracking-[0.2em] ${isOuro ? "text-accent" : "text-muted-foreground"}`}>{p.id}</div>
            <div className={`mt-1 font-display text-3xl ${isOuro ? "text-white" : "text-navy"}`}>{p.nome}</div>
            <div className={`mt-4 font-display text-4xl ${isOuro ? "text-accent" : "text-navy"}`}>{formatKz(p.preco)}</div>
            <ul className={`mt-6 space-y-2 text-sm ${isOuro ? "text-white/85" : "text-foreground/80"}`}>
              {p.descricao.map((d) => (
                <li key={d} className="flex items-center gap-2">
                  <Check className={`h-4 w-4 ${isOuro ? "text-accent" : "text-success"}`} /> {d}
                </li>
              ))}
            </ul>
            <div className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${selected ? "text-accent" : isOuro ? "text-white" : "text-navy"}`}>
              {selected ? "Selecionado" : "Selecionar"} <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StepCalendario({
  data, setData, periodo, setPeriodo, espacoId,
}: {
  data: Date | null; setData: (d: Date) => void;
  periodo: Period | null; setPeriodo: (p: Period | null) => void;
  espacoId?: string | null;
}) {
  const [cursor, setCursor] = useState(new Date());
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const ocupados = useMemo(() => (data ? Store.periodosOcupados(format(data, "yyyy-MM-dd"), espacoId ?? undefined) : []), [data, espacoId]);
  const manhaOcupada = ocupados.includes("manha");
  const tardeOcupada = ocupados.includes("tarde");

  function diaTotalmenteOcupado(d: Date) {
    const ps = Store.periodosOcupados(format(d, "yyyy-MM-dd"), espacoId ?? undefined);
    return ps.includes("manha") && ps.includes("tarde");
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setCursor(addMonths(cursor, -1))} className="grid h-9 w-9 place-items-center rounded-full bg-white/70"><ChevronLeft className="h-4 w-4" /></button>
          <div className="font-display text-xl capitalize text-navy">{format(cursor, "MMMM yyyy", { locale: pt })}</div>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="grid h-9 w-9 place-items-center rounded-full bg-white/70"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
          {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((d) => {
            const past = isBefore(d, addDays(today, -1));
            const outside = !isSameMonth(d, cursor);
            const blocked = !past && diaTotalmenteOcupado(d);
            const selected = data && isSameDay(d, data);
            const disabled = past || blocked;
            return (
              <button
                key={d.toISOString()}
                disabled={disabled}
                onClick={() => { setData(d); setPeriodo(null); }}
                className={`relative aspect-square rounded-xl text-sm transition
                  ${outside ? "text-muted-foreground/40" : "text-foreground"}
                  ${selected ? "bg-navy text-primary-foreground" : disabled ? "bg-white/30 line-through opacity-50" : "bg-white/70 hover:bg-white"}
                `}
              >
                {format(d, "d")}
                {blocked && !selected && <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-destructive" />}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Dia indisponível</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-navy" /> Selecionado</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Período</div>
        <div className="mt-1 font-display text-xl text-navy">
          {data ? format(data, "EEEE, d 'de' MMMM", { locale: pt }) : "Escolha primeiro uma data"}
        </div>

        <div className="mt-5 grid gap-3">
          <PeriodButton
            active={periodo === "manha"}
            disabled={!data || manhaOcupada}
            onClick={() => setPeriodo("manha")}
            icon={<Sun className="h-5 w-5" />}
            title="Manhã"
            hint="08h00 — 13h00"
            ocupado={manhaOcupada}
          />
          <PeriodButton
            active={periodo === "tarde"}
            disabled={!data || tardeOcupada}
            onClick={() => setPeriodo("tarde")}
            icon={<Sunset className="h-5 w-5" />}
            title="Tarde"
            hint="14h00 — 19h00"
            ocupado={tardeOcupada}
          />
        </div>
      </div>
    </div>
  );
}

function PeriodButton(props: { active: boolean; disabled: boolean; onClick: () => void; icon: React.ReactNode; title: string; hint: string; ocupado: boolean; }) {
  return (
    <button
      disabled={props.disabled}
      onClick={props.onClick}
      className={`flex w-full items-center justify-between rounded-2xl p-4 text-left transition
        ${props.active ? "bg-navy text-primary-foreground" : props.disabled ? "bg-white/40 opacity-60" : "bg-white/80 hover:bg-white"}`}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${props.active ? "bg-white/15" : "bg-secondary"}`}>{props.icon}</div>
        <div>
          <div className="font-medium">{props.title}</div>
          <div className={`text-xs ${props.active ? "text-white/70" : "text-muted-foreground"}`}>{props.hint}</div>
        </div>
      </div>
      {props.ocupado && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">Ocupado</span>}
    </button>
  );
}

type FormState = { nome: string; email: string; telefone: string; tipo_evento: string; tipo_evento_outro: string; max_convidados: string };

function DetalhesField({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-3 py-2">
        {icon}
        {children}
      </div>
    </label>
  );
}

function StepDetalhes({ form, setForm }: { form: FormState; setForm: (f: FormState) => void }) {
  const grupos = useMemo(() => {
    const m = new Map<string, typeof TIPOS_EVENTO>();
    TIPOS_EVENTO.forEach((t) => {
      const arr = m.get(t.categoria) ?? [];
      arr.push(t);
      m.set(t.categoria, arr);
    });
    return Array.from(m.entries());
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetalhesField icon={<User className="h-4 w-4 text-muted-foreground" />} label="Nome completo">
        <input
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          placeholder="Ex: Alexandra Domingos"
          className="w-full bg-transparent text-sm outline-none"
        />
      </DetalhesField>
      <DetalhesField icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="E-mail">
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="voce@email.com"
          className="w-full bg-transparent text-sm outline-none"
        />
      </DetalhesField>
      <DetalhesField icon={<Phone className="h-4 w-4 text-muted-foreground" />} label="Telefone">
        <input
          value={form.telefone}
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          placeholder="+244 9XX XXX XXX"
          className="w-full bg-transparent text-sm outline-none"
        />
      </DetalhesField>
      <DetalhesField icon={<PartyPopper className="h-4 w-4 text-muted-foreground" />} label="Tipo de evento">
        <select
          value={form.tipo_evento}
          onChange={(e) => setForm({ ...form, tipo_evento: e.target.value })}
          className="w-full bg-transparent text-sm outline-none"
        >
          <option value="">Selecione…</option>
          {grupos.map(([cat, lista]) => (
            <optgroup key={cat} label={cat}>
              {lista.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </DetalhesField>
      {form.tipo_evento === "outro" && (
        <DetalhesField label="Especifique o tipo">
          <input
            value={form.tipo_evento_outro}
            onChange={(e) => setForm({ ...form, tipo_evento_outro: e.target.value })}
            placeholder="Descreva o tipo de evento"
            className="w-full bg-transparent text-sm outline-none"
          />
        </DetalhesField>
      )}
      <DetalhesField icon={<Users className="h-4 w-4 text-muted-foreground" />} label={`Nº máximo de convidados (até ${CAPACIDADE_ESPACO})`}>
        <input
          type="number"
          min={1}
          max={CAPACIDADE_ESPACO}
          value={form.max_convidados}
          onChange={(e) => setForm({ ...form, max_convidados: e.target.value })}
          placeholder="Ex: 80"
          className="w-full bg-transparent text-sm outline-none"
        />
      </DetalhesField>
    </div>
  );
}

function StepCheckout({ reserva, onIr }: { reserva: Awaited<ReturnType<typeof Store.criarReserva>>; onIr: () => void }) {
  const pkg = PACKAGES.find((p) => p.id === reserva.pacote_id)!;
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
      <div className="glass rounded-2xl p-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Resumo da reserva</div>
        <div className="mt-1 font-display text-2xl text-navy">{pkg.nome}</div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k="Cliente" v={reserva.cliente_nome} />
          <Row k="Evento" v={reserva.tipo_evento} />
          <Row k="Data" v={format(new Date(reserva.data_evento), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })} />
          <Row k="Período" v={reserva.periodo === "manha" ? "Manhã (08h–13h)" : "Tarde (14h–19h)"} />
          <Row k="Status" v={<span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Aguardando Pagamento</span>} />
        </dl>
      </div>

      <div className="glass-dark rounded-2xl p-6">
        <div className="text-xs uppercase tracking-widest text-accent">Pagamento por Referência Multicaixa</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <PayBox label="Entidade" value={reserva.entidade_pagamento} />
          <PayBox label="Referência" value={reserva.referencia_pagamento} />
        </div>
        <div className="mt-3 rounded-2xl bg-white/10 p-4">
          <div className="text-xs uppercase tracking-widest text-white/70">Valor a pagar</div>
          <div className="font-display text-4xl text-accent">{formatKz(pkg.preco)}</div>
        </div>
        <p className="mt-4 text-xs text-white/70">
          Efetue o pagamento em qualquer ATM ou Multicaixa Express. Após confirmação, o seu pacote será ativado e poderá gerir os seus convidados.
        </p>
        <button onClick={onIr} className="btn-gold mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium">
          Ir para a minha reserva <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PayBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="text-[10px] uppercase tracking-widest text-white/70">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="font-display text-2xl text-white">{value}</div>
        <button onClick={() => navigator.clipboard.writeText(value)} className="rounded-lg bg-white/10 p-1.5 text-white/70 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-border/60 py-2 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right text-foreground">{v}</dd>
    </div>
  );
}
