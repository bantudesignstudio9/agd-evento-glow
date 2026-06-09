// Estrutura preparada para autenticação staff por código alfanumérico 6-dígitos.
// Ainda NÃO está ligada ao UI activo — o admin continua a usar a palavra-passe
// partilhada. Activar mais tarde com a flag VITE_STAFF_AUTH=on e ligando ao
// fluxo de /admin/login. Ver .lovable/plan.md.

import { createServerFn } from "@tanstack/react-start";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0,O,1,I
const CODE_LENGTH = 6;
const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_TENTATIVAS = 5;

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function gerarCodigo(): string {
  let out = "";
  const arr = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(arr);
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
  return out;
}

export const requestStaffCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const { data: user } = await supabaseAdmin.from("staff_users" as never).select("id, activo").eq("email", email).maybeSingle();
    if (!user || !(user as { activo: boolean }).activo) {
      // Não revela se existe — devolve ok genérico
      return { ok: true };
    }
    const code = gerarCodigo();
    const code_hash = await sha256(code);
    const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString();
    await supabaseAdmin.from("staff_auth_codes" as never).insert({
      staff_user_id: (user as { id: string }).id, code_hash, expires_at,
    } as never);
    // TODO: enviar via SMS (Twilio) ou email quando activar
    console.log(`[staff-auth] código gerado para ${email}: ${code} (expira em 10 min)`);
    return { ok: true };
  });

export const verifyStaffCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim().toUpperCase();
    const { data: user } = await supabaseAdmin.from("staff_users" as never).select("id").eq("email", email).maybeSingle();
    if (!user) throw new Error("Credenciais inválidas");

    const code_hash = await sha256(code);
    const { data: rec } = await supabaseAdmin.from("staff_auth_codes" as never)
      .select("*").eq("staff_user_id", (user as { id: string }).id).eq("code_hash", code_hash)
      .is("used_at", null).order("criado_em", { ascending: false }).limit(1).maybeSingle();
    const r = rec as { id: string; expires_at: string; tentativas: number } | null;
    if (!r) throw new Error("Código inválido");
    if (new Date(r.expires_at).getTime() < Date.now()) throw new Error("Código expirado");
    if (r.tentativas >= MAX_TENTATIVAS) throw new Error("Tentativas esgotadas");

    const token = crypto.randomUUID() + crypto.randomUUID();
    const token_hash = await sha256(token);
    const expires_at = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    await supabaseAdmin.from("staff_sessions" as never).insert({
      staff_user_id: (user as { id: string }).id, token_hash, expires_at,
    } as never);
    await supabaseAdmin.from("staff_auth_codes" as never)
      .update({ used_at: new Date().toISOString() } as never).eq("id", r.id);

    return { ok: true, token, expires_at };
  });
