import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { Convidado, DesignConvite, Reserva } from "./types";
import { DEFAULT_LOCAL, labelPeriodo } from "./types";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export async function gerarConvitePDF(
  reserva: Reserva,
  convidado: Convidado,
  design: DesignConvite,
) {
  const doc = new jsPDF({ unit: "pt", format: [420, 640], orientation: "portrait" });
  const W = 420;
  const H = 640;

  doc.setFillColor(design.bg);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(design.accent);
  doc.rect(0, 0, W, 8, "F");
  doc.rect(0, H - 8, W, 8, "F");

  doc.setDrawColor(design.accent);
  doc.setLineWidth(1);
  doc.roundedRect(24, 24, W - 48, H - 48, 10, 10, "S");

  const txtColor = isLight(design.bg) ? "#1a1a1a" : "#ffffff";

  doc.setTextColor(design.accent);
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.text("AGD EVENTOS", W / 2, 70, { align: "center" });

  doc.setTextColor(txtColor);
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  const titulo = reserva.evento_nome || reserva.tipo_evento;
  doc.text(titulo, W / 2, 115, { align: "center", maxWidth: W - 80 });

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(design.accent);
  doc.text("CONVITE ESPECIAL", W / 2, 140, { align: "center" });

  doc.setTextColor(txtColor);
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.text("Convidamos especialmente", W / 2, 185, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(convidado.nome_convidado, W / 2, 215, { align: "center", maxWidth: W - 60 });

  if (reserva.mensagem_boas_vindas) {
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    const msg = doc.splitTextToSize(`"${reserva.mensagem_boas_vindas}"`, W - 100);
    doc.text(msg, W / 2, 250, { align: "center" });
  }

  const data = format(new Date(reserva.data_evento), "d 'de' MMMM 'de' yyyy", { locale: pt });
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(design.accent);
  doc.text(data.toUpperCase(), W / 2, 305, { align: "center" });

  doc.setTextColor(txtColor);
  doc.setFontSize(10);
  const hora = reserva.hora_inicio && reserva.hora_fim
    ? `${reserva.hora_inicio} — ${reserva.hora_fim}`
    : `Período da ${labelPeriodo(reserva.periodo)}`;
  doc.text(hora, W / 2, 322, { align: "center" });

  const endereco = reserva.local_evento?.endereco ?? DEFAULT_LOCAL.endereco;
  const enderecoLines = doc.splitTextToSize(endereco, W - 80);
  doc.setFontSize(9);
  doc.text(enderecoLines, W / 2, 342, { align: "center" });

  const qrData = await QRCode.toDataURL(convidado.qr_code_hash, {
    width: 320, margin: 1, color: { dark: "#000000", light: "#ffffff" },
  });
  const qrSize = 130;
  doc.setFillColor("#ffffff");
  doc.roundedRect(W / 2 - qrSize / 2 - 8, 400, qrSize + 16, qrSize + 16, 8, 8, "F");
  doc.addImage(qrData, "PNG", W / 2 - qrSize / 2, 408, qrSize, qrSize);

  doc.setTextColor(design.accent);
  doc.setFontSize(8);
  doc.text(convidado.qr_code_hash, W / 2, 575, { align: "center" });
  doc.setTextColor(txtColor);
  doc.setFontSize(8);
  doc.text("Apresente este QR Code à entrada", W / 2, 590, { align: "center" });
  doc.setFontSize(7);
  doc.setTextColor(design.accent);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  doc.text(`${origin}/convite?c=${convidado.qr_code_hash}`, W / 2, 608, { align: "center" });

  doc.save(`convite-${convidado.nome_convidado.replace(/\s+/g, "-")}.pdf`);
}

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160;
}

export function copiarLinkConvite(convidado: Convidado): string {
  const url = `${window.location.origin}/convite?c=${convidado.qr_code_hash}`;
  navigator.clipboard?.writeText(url);
  return url;
}
