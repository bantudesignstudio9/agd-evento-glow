import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Store } from "@/lib/store";
import { useStoreVersion } from "@/hooks/useStore";
import { tipoEventoUsaSessoes } from "@/lib/types";
import { CheckCircle2, ScanLine, XCircle, Camera, CameraOff, Ticket, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export const Route = createFileRoute("/admin/checkin")({
  component: CheckinPage,
});

type Result = { ok: boolean; msg: string; nome?: string; ts: number };

function CheckinPage() {
  useStoreVersion();
  const [eventoRef, setEventoRef] = useState("");
  const reservaAlvo = useMemo(() => (eventoRef.trim() ? Store.getReservaByRef(eventoRef) : undefined), [eventoRef]);
  const usaSessoes = !!reservaAlvo && tipoEventoUsaSessoes(reservaAlvo.tipo_evento);
  const sessoesReserva = useMemo(
    () => (reservaAlvo ? Store.sessoesDaReserva(reservaAlvo.id) : []),
    [reservaAlvo],
  );

  // Pré-seleciona sessão de hoje se existir
  const hoje = format(new Date(), "yyyy-MM-dd");
  const [sessaoId, setSessaoId] = useState<string>("");
  useEffect(() => {
    if (!usaSessoes) { setSessaoId(""); return; }
    const hojeSessao = sessoesReserva.find((s) => s.data === hoje);
    setSessaoId(hojeSessao?.id ?? sessoesReserva[0]?.id ?? "");
  }, [reservaAlvo?.id, sessoesReserva.length, hoje, usaSessoes]);

  const sessaoAtiva = sessoesReserva.find((s) => s.id === sessaoId);
  const presencasSessao = sessaoAtiva ? Store.presencasDaSessao(sessaoAtiva.id) : [];

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manualHash, setManualHash] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScan = useRef<{ hash: string; at: number }>({ hash: "", at: 0 });

  useEffect(() => () => { stopScan(); }, []);

  async function startScan() {
    setScanning(true);
    try {
      const el = document.getElementById("qr-reader");
      if (!el) return;
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleDecoded(decoded),
        () => {},
      );
    } catch (e: any) {
      setScanning(false);
      setResult({ ok: false, msg: e?.message ?? "Não foi possível aceder à câmera", ts: Date.now() });
    }
  }

  async function stopScan() {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {}
    scannerRef.current = null;
    setScanning(false);
  }

  async function handleDecoded(hash: string) {
    const now = Date.now();
    if (lastScan.current.hash === hash && now - lastScan.current.at < 2500) return;
    lastScan.current = { hash, at: now };
    const cleanHash = hash.trim();

    if (reservaAlvo) {
      const c = Store.getConvidadoByHash(cleanHash);
      if (!c || c.reserva_id !== reservaAlvo.id) {
        setResult({ ok: false, msg: "QR não pertence ao evento selecionado", ts: now });
        return;
      }
    }

    // Cursos/formações → marca presença na sessão activa
    if (usaSessoes) {
      if (!sessaoAtiva) {
        setResult({ ok: false, msg: "Selecione a sessão actual", ts: now });
        return;
      }
      const r = await Store.checkinSessao(cleanHash, sessaoAtiva.id);
      setResult({ ok: r.ok, msg: r.msg, nome: r.convidado?.nome_convidado, ts: now });
      return;
    }

    // Eventos normais → check-in único
    const r = await Store.checkin(cleanHash);
    setResult({ ok: r.ok, msg: r.msg, nome: r.convidado?.nome_convidado, ts: now });
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">No dia do evento</div>
        <h1 className="font-display text-3xl text-navy">Scanner de Check-in</h1>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Referência do evento (filtro)</label>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white/80 px-3 py-2">
              <Ticket className="h-4 w-4 text-accent" />
              <input
                value={eventoRef}
                onChange={(e) => setEventoRef(e.target.value)}
                placeholder="9 dígitos · vazio = aceita qualquer evento"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="text-sm">
            {eventoRef && (reservaAlvo
              ? <span className="rounded-full bg-success/15 px-3 py-1 text-success">{reservaAlvo.evento_nome || reservaAlvo.tipo_evento} · {reservaAlvo.cliente_nome}</span>
              : <span className="rounded-full bg-destructive/15 px-3 py-1 text-destructive">Referência inválida</span>)}
          </div>
        </div>

        {usaSessoes && (
          <div className="mt-4 border-t border-white/40 pt-4">
            <label className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
              <CalendarDays className="h-3 w-3" /> Sessão activa
            </label>
            {sessoesReserva.length === 0 ? (
              <div className="rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                Este curso ainda não tem sessões. Peça ao cliente para criá-las no dashboard.
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sessaoId}
                  onChange={(e) => setSessaoId(e.target.value)}
                  className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm outline-none"
                >
                  {sessoesReserva.map((s) => (
                    <option key={s.id} value={s.id}>
                      {format(new Date(s.data), "EEE, d MMM", { locale: pt })} · {s.titulo}
                      {s.data === hoje ? " (hoje)" : ""}
                    </option>
                  ))}
                </select>
                {sessaoAtiva && (
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs text-navy">
                    {presencasSessao.length} presença(s) marcada(s)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="glass-strong rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ScanLine className="h-4 w-4" /> Câmera
            </div>
            {!scanning ? (
              <button onClick={startScan} className="btn-navy inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
                <Camera className="h-4 w-4" /> Iniciar
              </button>
            ) : (
              <button onClick={stopScan} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm">
                <CameraOff className="h-4 w-4" /> Parar
              </button>
            )}
          </div>
          <div id="qr-reader" className="overflow-hidden rounded-2xl bg-black/80 [&_video]:!w-full" />
          {!scanning && (
            <p className="mt-3 text-xs text-muted-foreground">Permita o acesso à câmera para escanear o QR Code dos convidados.</p>
          )}

          <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/50 p-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Inserir manualmente</div>
            <div className="mt-2 flex gap-2">
              <input
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
                placeholder="AGD-XXXX-XXXX"
                className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={() => { if (manualHash) { handleDecoded(manualHash); setManualHash(""); } }}
                className="btn-navy rounded-xl px-4 text-sm"
              >Validar</button>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl p-8 transition ${
          !result ? "glass-strong" :
          result.ok ? "bg-gradient-to-br from-green-500 to-green-700 text-white" :
          "bg-gradient-to-br from-red-500 to-red-700 text-white"
        }`}>
          {!result && (
            <div className="text-center text-muted-foreground">
              <ScanLine className="mx-auto h-12 w-12" />
              <p className="mt-4 text-sm">Aguardando leitura...</p>
            </div>
          )}
          {result && (
            <div className="text-center">
              {result.ok ? <CheckCircle2 className="mx-auto h-20 w-20" /> : <XCircle className="mx-auto h-20 w-20" />}
              <div className="mt-4 font-display text-3xl">
                {result.ok ? (usaSessoes ? "Presença Marcada" : "Entrada Autorizada") : "Inválido / Já Marcado"}
              </div>
              {result.nome && <div className="mt-2 text-lg opacity-90">{result.nome}</div>}
              <div className="mt-1 text-xs opacity-80">{result.msg}</div>
            </div>
          )}
        </div>
      </div>

      {usaSessoes && sessaoAtiva && presencasSessao.length > 0 && (
        <div className="glass-strong rounded-3xl p-6">
          <h3 className="mb-3 font-display text-lg text-navy">Presenças desta sessão ({presencasSessao.length})</h3>
          <ul className="divide-y divide-white/40 text-sm">
            {presencasSessao.map((p) => {
              const c = Store.convidados().find((x) => x.id === p.convidado_id);
              return (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span>{c?.nome_convidado ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(p.marcado_em), "HH:mm")}
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
