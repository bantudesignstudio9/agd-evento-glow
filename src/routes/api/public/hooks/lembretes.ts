import { createFileRoute } from "@tanstack/react-router";

// Comparação em tempo constante (evita timing attacks)
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}



/**
 * Cron endpoint - chamado diariamente por pg_cron.
 * Envia SMS de lembrete (D-2) aos convidados ainda não lembrados,
 * com telefone e que não tenham recusado.
 */
export const Route = createFileRoute("/api/public/hooks/lembretes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Shared-secret guard — só o pg_cron / scheduler com o secret pode chamar.
        // Sem CRON_SECRET configurado o endpoint fica fechado (devolve 401).
        const expected = process.env.CRON_SECRET;
        const url0 = new URL(request.url);
        const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
          || url0.searchParams.get("secret")
          || "";
        if (!expected || provided.length !== expected.length || !timingSafeEqualStr(provided, expected)) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
          return Response.json({ ok: false, error: "missing supabase env" }, { status: 500 });
        }


        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const hoje = new Date();
        const alvo = new Date(hoje.getTime() + 2 * 86400000)
          .toISOString().slice(0, 10);

        const { data: reservas } = await supabaseAdmin
          .from("reservas")
          .select("id,evento_nome,tipo_evento,data_evento,hora_inicio,periodo,local_evento,referencia_pagamento,status")
          .eq("data_evento", alvo)
          .eq("status", "Pago");

        if (!reservas?.length) return Response.json({ ok: true, enviados: 0, motivo: "sem reservas no alvo" });

        const ids = reservas.map((r) => r.id);
        const { data: convidados } = await supabaseAdmin
          .from("convidados")
          .select("id,reserva_id,nome_convidado,telefone,qr_code_hash,rsvp_status,lembrete_enviado_em")
          .in("reserva_id", ids)
          .is("lembrete_enviado_em", null)
          .neq("rsvp_status", "recusado")
          .not("telefone", "is", null);

        if (!convidados?.length) return Response.json({ ok: true, enviados: 0 });

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
        const FROM = process.env.TWILIO_FROM_NUMBER;
        if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !FROM) {
          return Response.json({ ok: false, error: "twilio não configurado" }, { status: 500 });
        }

        let enviados = 0;
        const erros: string[] = [];

        for (const c of convidados) {
          const r = reservas.find((x) => x.id === c.reserva_id);
          if (!r) continue;
          const titulo = r.evento_nome ?? r.tipo_evento;
          const hora = r.hora_inicio ?? horasPeriodo(r.periodo).inicio;
          const body = `AGD Eventos · Lembrete\nOlá ${c.nome_convidado}, o evento "${titulo}" é daqui a 2 dias (${alvo}) às ${hora}.\nCódigo: ${c.qr_code_hash}`;

          let to = (c.telefone || "").replace(/[^\d+]/g, "");
          if (!to.startsWith("+")) {
            const digits = to.replace(/\D/g, "");
            to = digits.length <= 9 ? `+244${digits}` : `+${digits}`;
          }

          try {
            const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": TWILIO_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({ To: to, From: FROM, Body: body }),
            });
            if (res.ok) {
              await supabaseAdmin.from("convidados")
                .update({ lembrete_enviado_em: new Date().toISOString() })
                .eq("id", c.id);
              enviados++;
            } else {
              const j = (await res.json().catch(() => ({}))) as { message?: string };
              erros.push(`${c.nome_convidado}: ${j.message ?? res.status}`);
            }
          } catch (e) {
            erros.push(`${c.nome_convidado}: ${e instanceof Error ? e.message : "rede"}`);
          }
        }

        return Response.json({ ok: true, enviados, erros, alvo, total: convidados.length });
      },
    },
  },
});
