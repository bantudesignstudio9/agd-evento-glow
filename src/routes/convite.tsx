import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useMemo } from "react";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { DEFAULT_DESIGN, DEFAULT_LOCAL, PACKAGES } from "@/lib/types";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, PartyPopper, Download } from "lucide-react";
import { MapaEvento } from "@/components/MapaEvento";
import { gerarConvitePDF } from "@/lib/invite";

const search = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/convite")({
  validateSearch: search,
  component: ConvitePage,
});

function ConvitePage() {
  useStoreVersion();
  const { c: hash } = Route.useSearch();
  const convidado = useMemo(() => (hash ? Store.getConvidadoByHash(hash) : undefined), [hash]);
  const reserva = convidado ? Store.getReserva(convidado.reserva_id) : undefined;

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

  const light = isLight(design.bg);
  const txt = light ? "#171717" : "#ffffff";
  const subtle = light ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.78)";

  return (
    <main className="mx-auto mt-10 w-[min(960px,95%)] pb-16">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* Convite */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 shadow-2xl"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${design.accent}44, transparent 60%), ${design.bg}`,
            color: txt,
            fontFamily: `'${design.fonte}', serif`,
          }}
        >
          <div className="absolute inset-x-0 top-0 h-2" style={{ background: design.accent }} />
          <div className="absolute inset-x-0 bottom-0 h-2" style={{ background: design.accent }} />
          <div className="absolute inset-4 rounded-2xl border" style={{ borderColor: `${design.accent}55` }} />

          <div className="relative flex flex-col items-center text-center">
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: design.accent }}>AGD Eventos</div>
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
                : reserva.periodo === "manha" ? "Manhã" : "Tarde"}
            </div>

            <div className="mt-6 rounded-2xl bg-white p-3">
              <QRCodeSVG value={convidado.qr_code_hash} size={140} />
            </div>
            <div className="mt-2 font-mono text-[10px]" style={{ color: subtle }}>{convidado.qr_code_hash}</div>
            <div className="mt-1 text-[10px]" style={{ color: subtle }}>Apresente este QR à entrada</div>
          </div>
        </div>

        {/* Info + Mapa */}
        <div className="space-y-4">
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
                  : reserva.periodo === "manha" ? "08h00 — 13h00" : "14h00 — 19h00"}
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
