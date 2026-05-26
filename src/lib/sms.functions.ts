import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const SmsSchema = z.object({
  to: z.string().min(6).max(20),
  body: z.string().min(1).max(1500),
});

export const enviarSms = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SmsSchema.parse(input))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    const FROM = process.env.TWILIO_FROM_NUMBER;

    if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY ausente" };
    if (!TWILIO_API_KEY) return { ok: false, error: "Twilio não conectado" };
    if (!FROM) return { ok: false, error: "TWILIO_FROM_NUMBER não configurado" };

    // Normaliza para E.164 (default Angola se não tiver +)
    let to = data.to.replace(/[^\d+]/g, "");
    if (!to.startsWith("+")) {
      const digits = to.replace(/\D/g, "");
      to = digits.length <= 9 ? `+244${digits}` : `+${digits}`;
    }

    try {
      const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: FROM, Body: data.body }),
      });
      const json = (await res.json()) as { sid?: string; message?: string; code?: number };
      if (!res.ok) {
        return { ok: false, error: json.message || `Erro ${res.status}` };
      }
      return { ok: true, sid: json.sid };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha de rede";
      return { ok: false, error: msg };
    }
  });
