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

export interface DesignConvite {
  bg: string;
  accent: string;
  fonte: string;
  textura: "liso" | "ondas" | "brilho";
}

export const DEFAULT_DESIGN: DesignConvite = {
  bg: "#0f172a",
  accent: "#d4a84c",
  fonte: "Playfair Display",
  textura: "brilho",
};

export interface LocalEvento {
  endereco: string;
  lat?: number;
  lng?: number;
}

export const DEFAULT_LOCAL: LocalEvento = {
  endereco: "Anfiteatro do Gabinete Provincial da Cultura e Turismo, Cidade Alta, Av. Imaculada da Conceição, Huambo, Angola",
  lat: -12.7763,
  lng: 15.7392,
};

export interface Reserva {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  tipo_evento: string;
  pacote_id: PackageId;
  data_evento: string;
  periodo: Period;
  status: Status;
  entidade_pagamento: string;
  referencia_pagamento: string;
  criado_em: string;
  evento_nome?: string;
  hora_inicio?: string;
  hora_fim?: string;
  mensagem_boas_vindas?: string;
  design_convite?: DesignConvite;
  local_evento?: LocalEvento;
}

export interface Convidado {
  id: string;
  reserva_id: string;
  nome_convidado: string;
  telefone?: string;
  qr_code_hash: string;
  status_checkin: boolean;
  sms_enviado_em?: string;
  whatsapp_enviado_em?: string;
}

export const CAPACIDADE_ESPACO = 150;

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

export const FONT_OPTIONS = [
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Inter", value: "Inter" },
  { label: "Bebas Neue", value: "Bebas Neue" },
];

export const COR_PRESETS = [
  "#0f172a", "#1e293b", "#3b2a4a", "#0c2340",
  "#3d2914", "#1f3a2e", "#4a1d2f", "#2d1b3d",
  "#ffffff", "#f5f0e0", "#d4a84c", "#8b6f3e",
];

export const formatKz = (n: number) =>
  new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n) + " Kz";
