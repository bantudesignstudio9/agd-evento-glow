import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Store, initStore } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { DEFAULT_DESIGN, DEFAULT_LOCAL, PACKAGES, tipoEventoUsaSessoes, labelPeriodo, horasPeriodo, type RsvpStatus } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, PartyPopper, Download, Loader2, Check, X, Users } from "lucide-react";
import { MapaEvento } from "@/components/MapaEvento";
import { gerarConvitePDF } from "@/lib/invite";
import { toast } from "sonner";

const search = z.object({
  c: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined ? undefined : String(v))),
});

export const Route = createFileRoute("/convite")({
  validateSearch: search,
  component: ConvitePage,
});

function ConvitePage() {
  useStoreVersion();
  const { c: hash } = Route.useSearch();
  const [ready, setReady] = useState(Store.initialized());

  useEffect(() => {
    let alive = true;
    initStore().then(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  const convidado = hash && ready ? Store.getConvidadoByHash(hash) : undefined;
  const reserva = convidado ? Store.getReserva(convidado.reserva_id) : undefined;

  if (!ready) {
    return (
      <main className="mx-auto mt-16 grid w-[min(560px,95%)] place-items-center">
        <div className="glass-strong rounded-3xl p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
          <p className="mt-3 text-sm text-muted-foreground">A carregar convite…</p>
        </div>
      </main>
    );
  }

  if (!hash || !convidado || !reserva) {
    return (
      <main className="mx-auto mt-16 w-[min(560px,95%)]">
        <div className="glass-strong rounded-3xl p-10 text-center">
          <h1 className="font-display text-3xl text-navy">Convite não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique o link recebido ou contacte quem lhe enviou.
          </p>
          <Link to="/" className="btn-navy mt-6 inline-flex rounded-xl px-5 py-2 text-sm">Ir ao início</Link>
        </div>
      </main>
    );
  }

  const design = reserva.design_convite ?? DEFAULT_DESIGN;
  const local = reserva.local_evento ?? DEFAULT_LOCAL;
  const pkg = PACKAGES.find((p) => p.id === reserva.pacote_id);
  const sessoes = tipoEventoUsaSessoes(reserva.tipo_evento) ? Store.sessoesDaReserva(reserva.id) : [];

  const light = isLight(design.bg);
  const txt = light ? "#171717" : "#ffffff";
  const subtle = light ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.78)";
  const det = convidado.detalhes;

  const bgStyle = design.bg_image_url
    ? {
        backgroundImage: `linear-gradient(${light ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"}, ${light ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"}), url(${design.bg_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        background: `radial-gradient(ellipse at 50% 0%, ${design.accent}44, transparent 60%), ${design.bg}`,
      };

  return (
    <main className="mx-auto mt-10 w-[min(960px,95%)] pb-16">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div
          className={`relative overflow-hidden rounded-3xl p-8 shadow-2xl ${design.animado ? "animate-fade-in" : ""}`}
          style={{ ...bgStyle, color: txt, fontFamily: `'${design.fonte}', serif` }}
        >
          {design.animado && (
            <div
              className="pointer-events-none absolute -inset-2 opacity-60"
              style={{
                background: `radial-gradient(circle at 30% 20%, ${design.accent}55, transparent 50%)`,
                animation: "pulse 4s ease-in-out infinite",
              }}
            />
          )}
          <div className="absolute inset-x-0 top-0 h-2" style={{ background: design.accent }} />
          <div className="absolute inset-x-0 bottom-0 h-2" style={{ background: design.accent }} />
          <div className="absolute inset-4 rounded-2xl border" style={{ borderColor: `${design.accent}55` }} />

          <div className="relative flex flex-col items-center text-center">
            {design.logo_url ? (
              <img src={design.logo_url} alt="logo" className="mb-3 max-h-16 object-contain" />
            ) : (
              <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: design.accent }}>AGD Eventos</div>
            )}
            <h1 className="mt-3 text-3xl font-bold leading-tight">{reserva.evento_nome || reserva.tipo_evento}</h1>
            <div className="mt-1 text-xs uppercase tracking-widest" style={{ color: design.accent }}>Convite Especial</div>

            <div className="mt-6 text-sm italic" style={{ color: subtle }}>Convidamos especialmente</div>
            <div className="mt-1 text-2xl font-semibold">{convidado.nome_convidado}</div>

            {reserva.mensagem_boas_vindas && (
              <p className="mt-4 max-w-xs text-sm italic" style={{ color: subtle }}>
                "{reserva.mensagem_boas_vindas}"
              </p>
            )}

            <div className="mt-6 text-sm uppercase tracking-widest" style={{ color: design.accent }}>
              {format(new Date(reserva.data_evento), "d 'de' MMMM 'de' yyyy", { locale: pt })}
            </div>
            <div className="text-sm" style={{ color: subtle }}>
              {reserva.hora_inicio && reserva.hora_fim
                ? `${reserva.hora_inicio} — ${reserva.hora_fim}`
                : labelPeriodo(reserva.periodo)}
            </div>

            {det && (det.mesa || det.lugar || det.area || det.turma) && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs" style={{ color: subtle }}>
                {det.mesa && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: `${design.accent}66` }}>Mesa {det.mesa}</span>}
                {det.lugar && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: `${design.accent}66` }}>Lugar {det.lugar}</span>}
                {det.area && <span className="rounded-full border px-2 py-0.5 uppercase" style={{ borderColor: `${design.accent}66` }}>{det.area}</span>}
                {det.turma && <span className="rounded-full border px-2 py-0.5" style={{ borderColor: `${design.accent}66` }}>Turma {det.turma}</span>}
              </div>
            )}

            <div className="mt-6 rounded-2xl bg-white p-3">
              <QRCodeSVG value={convidado.qr_code_hash} size={140} />
            </div>
            <div className="mt-2 font-mono text-[10px]" style={{ color: subtle }}>{convidado.qr_code_hash}</div>
            <div className="mt-1 text-[10px]" style={{ color: subtle }}>Apresente este QR à entrada</div>
          </div>
        </div>


        <div className="space-y-4">
          <RsvpCard hash={convidado.qr_code_hash} status={convidado.rsvp_status ?? "pendente"} acompanhantes={convidado.rsvp_acompanhantes ?? 0} />

          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center gap-2 text-navy">
              <PartyPopper className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl">Detalhes do evento</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <Info icon={<CalendarDays className="h-4 w-4 text-accent" />} k="Data">
                {format(new Date(reserva.data_evento), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
              </Info>
              <Info icon={<Clock className="h-4 w-4 text-accent" />} k="Horário">
                {reserva.hora_inicio && reserva.hora_fim
                  ? `${reserva.hora_inicio} — ${reserva.hora_fim}`
                  : horasPeriodo(reserva.periodo).hint}
              </Info>
              <Info icon={<MapPin className="h-4 w-4 text-accent" />} k="Local">
                {local.endereco}
              </Info>
              {pkg && (
                <div className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-navy">
                  Organização: AGD Eventos · {pkg.nome}
                </div>
              )}
            </dl>
            <button
              onClick={() => gerarConvitePDF(reserva, convidado, design)}
              className="btn-gold mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Download className="h-4 w-4" /> Baixar convite em PDF
            </button>
          </div>

          {sessoes.length > 0 && (
            <div className="glass-strong rounded-3xl p-6">
              <div className="flex items-center gap-2 text-navy">
                <CalendarDays className="h-5 w-5 text-accent" />
                <h2 className="font-display text-2xl">Sessões / aulas</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                O mesmo QR Code é válido para todas as sessões — apresente em cada entrada.
              </p>
              <ul className="mt-3 divide-y divide-white/40 text-sm">
                {sessoes.map((s, i) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-navy">{i + 1}. {s.titulo}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(s.data), "EEE, d MMM yyyy", { locale: pt })}
                        {s.hora_inicio ? ` · ${s.hora_inicio}${s.hora_fim ? `–${s.hora_fim}` : ""}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {local.lat != null && local.lng != null && (
            <div className="glass-strong overflow-hidden rounded-3xl p-2">
              <MapaEvento lat={local.lat} lng={local.lng} label={local.endereco} height={300} />
              <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
                <span>Como chegar</span>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${local.lat}&mlon=${local.lng}#map=17/${local.lat}/${local.lng}`}
                  target="_blank" rel="noreferrer"
                  className="rounded-lg bg-white/70 px-3 py-1 text-navy hover:bg-white"
                >Abrir no OpenStreetMap</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function RsvpCard({ hash, status, acompanhantes }: { hash: string; status: RsvpStatus; acompanhantes: number }) {
  const [extra, setExtra] = useState(acompanhantes);
  const [busy, setBusy] = useState(false);

  async function responder(s: RsvpStatus) {
    setBusy(true);
    try {
      await Store.rsvp(hash, s, s === "confirmado" ? extra : 0);
      toast.success(s === "confirmado" ? "Presença confirmada!" : s === "recusado" ? "Resposta registada" : "Atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setBusy(false);
    }
  }

  const isConfirmado = status === "confirmado";
  const isRecusado = status === "recusado";

  return (
    <div className={`rounded-3xl p-6 shadow-lg ${
      isConfirmado ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white" :
      isRecusado ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white" :
      "glass-strong"
    }`}>
      <div className="flex items-center gap-2">
        <Users className={`h-5 w-5 ${isConfirmado || isRecusado ? "" : "text-accent"}`} />
        <h2 className={`font-display text-xl ${isConfirmado || isRecusado ? "" : "text-navy"}`}>Confirmação de presença</h2>
      </div>

      {status === "pendente" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Por favor, confirme se irá comparecer. Isto ajuda a equipa a preparar o evento.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground/80">
            Acompanhantes (+1):
            <input
              type="number" min={0} max={5} value={extra}
              onChange={(e) => setExtra(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 rounded-lg border border-border bg-white/80 px-2 py-1 text-sm outline-none"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => responder("confirmado")} disabled={busy}
              className="btn-gold inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
              <Check className="h-4 w-4" /> Confirmo presença
            </button>
            <button onClick={() => responder("recusado")} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm disabled:opacity-50">
              <X className="h-4 w-4" /> Não poderei ir
            </button>
          </div>
        </>
      )}

      {isConfirmado && (
        <>
          <p className="mt-2 text-sm opacity-90">
            Confirmado! {acompanhantes > 0 && `Está reservado para si + ${acompanhantes} acompanhante(s).`}
          </p>
          <button onClick={() => responder("recusado")} disabled={busy}
            className="mt-4 rounded-xl bg-white/20 px-3 py-1.5 text-xs hover:bg-white/30 disabled:opacity-50">
            Alterar resposta
          </button>
        </>
      )}

      {isRecusado && (
        <>
          <p className="mt-2 text-sm opacity-90">A sua resposta foi registada. Sentiremos a sua falta!</p>
          <button onClick={() => responder("confirmado")} disabled={busy}
            className="mt-4 rounded-xl bg-white/20 px-3 py-1.5 text-xs hover:bg-white/30 disabled:opacity-50">
            Mudei de ideias — quero ir
          </button>
        </>
      )}
    </div>
  );
}

function Info({ icon, k, children }: { icon: React.ReactNode; k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function isLight(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160;
}
