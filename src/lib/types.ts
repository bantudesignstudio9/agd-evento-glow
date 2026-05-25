export type PackageId = "prata" | "ouro";
export type Period = "manha" | "tarde";
export type Status = "Pendente" | "Pago" | "Cancelado";

export interface Package {
  id: PackageId;
  nome: string;
  preco: number;
  descricao: string[];
  permite_convites_digitais: boolean;
}

export interface Reserva {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  tipo_evento: string;
  pacote_id: PackageId;
  data_evento: string; // YYYY-MM-DD
  periodo: Period;
  status: Status;
  entidade_pagamento: string;
  referencia_pagamento: string;
  criado_em: string;
}

export interface Convidado {
  id: string;
  reserva_id: string;
  nome_convidado: string;
  qr_code_hash: string;
  status_checkin: boolean;
}

export const PACKAGES: Package[] = [
  {
    id: "prata",
    nome: "Plano Prata",
    preco: 45000,
    descricao: ["Espaço completo", "Decoração própria", "Convites tradicionais"],
    permite_convites_digitais: false,
  },
  {
    id: "ouro",
    nome: "Plano Ouro",
    preco: 75000,
    descricao: [
      "Espaço completo",
      "Sistema de som profissional",
      "Climatização",
      "Projector e ecrã",
      "Protocolo AGD",
      "Convites digitais com QR Code",
    ],
    permite_convites_digitais: true,
  },
];

export const formatKz = (n: number) =>
  new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n) + " Kz";
