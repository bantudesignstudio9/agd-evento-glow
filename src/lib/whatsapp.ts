import type { Convidado, Reserva } from "./types";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function mensagemConvite(reserva: Reserva, c: Convidado): string {
  const data = format(new Date(reserva.data_evento), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
  const hora = reserva.hora_inicio && reserva.hora_fim
    ? `${reserva.hora_inicio} — ${reserva.hora_fim}`
    : reserva.periodo === "manha" ? "Manhã" : "Tarde";
  const local = reserva.local_evento?.endereco ?? "Anfiteatro do Gab. Prov. Cultura, Huambo";
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/convite?c=${c.qr_code_hash}`;

  return [
    `🎉 *${reserva.evento_nome || reserva.tipo_evento}* — AGD Eventos`,
    ``,
    `Olá ${c.nome_convidado}, está convidado(a)!`,
    reserva.mensagem_boas_vindas ? `\n_${reserva.mensagem_boas_vindas}_\n` : ``,
    `📅 ${data}`,
    `🕒 ${hora}`,
    `📍 ${local}`,
    ``,
    `🎟 Código de entrada: *${c.qr_code_hash}*`,
    `🔗 Convite digital: ${link}`,
    ``,
    `_Apresente o QR Code à entrada._`,
  ].filter(Boolean).join("\n");
}

export function whatsappLink(telefone: string | undefined, msg: string): string | null {
  if (!telefone) return null;
  const num = onlyDigits(telefone);
  if (num.length < 8) return null;
  // Default Angola country code if missing
  const full = num.length <= 9 ? `244${num}` : num;
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}
