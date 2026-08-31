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
  logo_url?: string;
  bg_image_url?: string;
  animado?: boolean;
}

export const DEFAULT_DESIGN: DesignConvite = {
  bg: "#0f172a",
  accent: "#d4a84c",
  fonte: "Playfair Display",
  textura: "brilho",
  animado: true,
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

export type MetodoPagamento = "iban" | "express";

export interface ConfigPagamento {
  id: string;
  iban: string;
  titular: string;
  banco: string;
  express_numero: string;
  instrucoes: string;
}

export const DEFAULT_CONFIG_PAGAMENTO: ConfigPagamento = {
  id: "",
  iban: "0040.0000.2456.6626.1024.7",
  titular: "Abréu G.Daniel - Comercial Lda",
  banco: "BAI",
  express_numero: "925788112",
  instrucoes: "Após a transferência ou pagamento por Multicaixa Express, carregue o comprovativo para validarmos a sua reserva.",
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
  max_convidados?: number;
  espaco_id?: string | null;
  alteracao_urgente?: boolean;
  metodo_pagamento?: MetodoPagamento | null;
  comprovativo_url?: string | null;
  comprovativo_em?: string | null;
}


export type RsvpStatus = "pendente" | "confirmado" | "recusado";

export interface ConvidadoDetalhes {
  mesa?: string;
  lugar?: string;
  area?: "vip" | "normal" | "palco" | "outra";
  turma?: string;
  funcao?: string;
  observacoes?: string;
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
  detalhes?: ConvidadoDetalhes;
  rsvp_status?: RsvpStatus;
  rsvp_acompanhantes?: number;
  rsvp_em?: string;
  lembrete_enviado_em?: string;
}

export interface Espaco {
  id: string;
  nome: string;
  endereco: string;
  capacidade: number;
  lat?: number | null;
  lng?: number | null;
  ativo: boolean;
  criado_em: string;
}

export interface Sessao {
  id: string;
  reserva_id: string;
  titulo: string;
  data: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  ordem: number;
  criado_em: string;
}

export interface Presenca {
  id: string;
  sessao_id: string;
  convidado_id: string;
  marcado_em: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  contacto?: string | null;
  telefone?: string | null;
  email?: string | null;
  categoria: string;
  activo: boolean;
  notas?: string | null;
  criado_em: string;
}

export interface Servico {
  id: string;
  fornecedor_id?: string | null;
  categoria: string;
  nome: string;
  descricao?: string | null;
  preco_base: number;
  unidade: string;
  imagem_url?: string | null;
  activo: boolean;
  criado_em: string;
}

export type ReservaServicoEstado = "pendente" | "confirmado" | "recusado" | "pago" | "cancelado";

export interface ReservaServico {
  id: string;
  reserva_id: string;
  servico_id: string;
  quantidade: number;
  preco_unit: number;
  subtotal: number;
  estado: ReservaServicoEstado;
  notas?: string | null;
  criado_em: string;
}

export interface ReservaAlteracao {
  id: string;
  reserva_id: string;
  staff_user_id?: string | null;
  staff_nome?: string | null;
  campo: string;
  valor_antigo?: string | null;
  valor_novo?: string | null;
  motivo?: string | null;
  urgente: boolean;
  notificado_cliente: boolean;
  criado_em: string;
}

export const CATEGORIAS_MARKETPLACE = [
  "Catering","Bar/Bebidas","Decoração & Floral","Bolos & Doces","Fotografia",
  "Vídeo & Drone","DJ/Som","Banda ao Vivo","Iluminação cénica","Mestre de Cerimónias",
  "Segurança","Protocolo","Transporte/Shuttle","Babysitting","Tradução",
  "Cabine Fotográfica","Fogo de artifício","Convites impressos","Lembranças","Limpeza pós-evento",
] as const;

export const TIPOS_EVENTO: { value: string; label: string; categoria: string }[] = [
  { value: "casamento", label: "Casamento", categoria: "Social" },
  { value: "noivado", label: "Noivado / Pedida", categoria: "Social" },
  { value: "aniversario_infantil", label: "Aniversário Infantil", categoria: "Social" },
  { value: "aniversario_adulto", label: "Aniversário Adulto", categoria: "Social" },
  { value: "bodas", label: "Bodas (Prata/Ouro)", categoria: "Social" },
  { value: "cha_bebe", label: "Chá de Bebé / Revelação", categoria: "Social" },
  { value: "cha_panela", label: "Chá de Panela / Bridal Shower", categoria: "Social" },
  { value: "despedida_solteiro", label: "Despedida de Solteiro(a)", categoria: "Social" },
  { value: "reuniao_familiar", label: "Reunião Familiar", categoria: "Social" },
  { value: "jantar_gala", label: "Jantar de Gala", categoria: "Social" },
  { value: "festa_tematica", label: "Festa Temática", categoria: "Social" },
  { value: "formatura", label: "Formatura / Graduação", categoria: "Académico" },
  { value: "defesa_tese", label: "Defesa de Tese", categoria: "Académico" },
  { value: "curso", label: "Curso / Workshop", categoria: "Académico" },
  { value: "palestra", label: "Palestra / Conferência", categoria: "Académico" },
  { value: "seminario", label: "Seminário", categoria: "Académico" },
  { value: "treinamento", label: "Treinamento Corporativo", categoria: "Corporativo" },
  { value: "lancamento_produto", label: "Lançamento de Produto", categoria: "Corporativo" },
  { value: "convencao", label: "Convenção / Assembleia", categoria: "Corporativo" },
  { value: "premiacao", label: "Cerimónia de Premiação", categoria: "Corporativo" },
  { value: "team_building", label: "Team Building", categoria: "Corporativo" },
  { value: "feira", label: "Feira / Exposição", categoria: "Corporativo" },
  { value: "networking", label: "Networking", categoria: "Corporativo" },
  { value: "reuniao_empresarial", label: "Reunião Empresarial", categoria: "Corporativo" },
  { value: "batizado", label: "Batizado", categoria: "Religioso" },
  { value: "comunhao", label: "Primeira Comunhão", categoria: "Religioso" },
  { value: "crisma", label: "Crisma / Confirmação", categoria: "Religioso" },
  { value: "culto_especial", label: "Culto Especial", categoria: "Religioso" },
  { value: "missa", label: "Missa de Acção de Graças", categoria: "Religioso" },
  { value: "concerto", label: "Concerto / Show", categoria: "Cultural" },
  { value: "exposicao_arte", label: "Exposição de Arte", categoria: "Cultural" },
  { value: "desfile_moda", label: "Desfile de Moda", categoria: "Cultural" },
  { value: "lancamento_livro", label: "Lançamento de Livro", categoria: "Cultural" },
  { value: "festival", label: "Festival", categoria: "Cultural" },
  { value: "outro", label: "Outro", categoria: "Social" },
];

export function labelTipoEvento(value: string): string {
  return TIPOS_EVENTO.find((t) => t.value === value)?.label ?? value;
}
export function tipoEventoUsaMesas(tipo: string): boolean {
  return ["casamento", "noivado", "bodas", "jantar_gala", "aniversario_adulto", "aniversario_infantil", "reuniao_familiar", "premiacao", "formatura", "batizado", "comunhao", "crisma"].includes(tipo);
}
export function tipoEventoUsaPoltrona(tipo: string): boolean {
  return ["palestra", "seminario", "concerto", "desfile_moda", "defesa_tese", "lancamento_livro", "missa", "culto_especial", "lancamento_produto", "convencao", "festival"].includes(tipo);
}
export function tipoEventoUsaTurma(tipo: string): boolean {
  return ["curso", "treinamento", "team_building", "workshop"].includes(tipo);
}
export function tipoEventoUsaSessoes(tipo: string): boolean {
  return ["curso", "treinamento", "team_building", "workshop", "seminario", "palestra", "convencao"].includes(tipo);
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
