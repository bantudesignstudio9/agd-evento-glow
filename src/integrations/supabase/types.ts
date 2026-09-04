export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      config_pagamento: {
        Row: {
          banco: string
          criado_em: string
          express_numero: string
          iban: string
          id: string
          instrucoes: string
          titular: string
          updated_at: string
        }
        Insert: {
          banco?: string
          criado_em?: string
          express_numero?: string
          iban?: string
          id?: string
          instrucoes?: string
          titular?: string
          updated_at?: string
        }
        Update: {
          banco?: string
          criado_em?: string
          express_numero?: string
          iban?: string
          id?: string
          instrucoes?: string
          titular?: string
          updated_at?: string
        }
        Relationships: []
      }
      convidados: {
        Row: {
          detalhes: Json | null
          id: string
          lembrete_enviado_em: string | null
          nome_convidado: string
          qr_code_hash: string
          reserva_id: string
          rsvp_acompanhantes: number
          rsvp_em: string | null
          rsvp_status: string
          sms_enviado_em: string | null
          status_checkin: boolean
          telefone: string | null
          whatsapp_enviado_em: string | null
        }
        Insert: {
          detalhes?: Json | null
          id?: string
          lembrete_enviado_em?: string | null
          nome_convidado: string
          qr_code_hash: string
          reserva_id: string
          rsvp_acompanhantes?: number
          rsvp_em?: string | null
          rsvp_status?: string
          sms_enviado_em?: string | null
          status_checkin?: boolean
          telefone?: string | null
          whatsapp_enviado_em?: string | null
        }
        Update: {
          detalhes?: Json | null
          id?: string
          lembrete_enviado_em?: string | null
          nome_convidado?: string
          qr_code_hash?: string
          reserva_id?: string
          rsvp_acompanhantes?: number
          rsvp_em?: string | null
          rsvp_status?: string
          sms_enviado_em?: string | null
          status_checkin?: boolean
          telefone?: string | null
          whatsapp_enviado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convidados_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      espacos: {
        Row: {
          ativo: boolean
          capacidade: number
          criado_em: string
          endereco: string
          id: string
          lat: number | null
          lng: number | null
          nome: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number
          criado_em?: string
          endereco: string
          id?: string
          lat?: number | null
          lng?: number | null
          nome: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number
          criado_em?: string
          endereco?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nome?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          activo: boolean
          categoria: string
          contacto: string | null
          criado_em: string
          email: string | null
          id: string
          nome: string
          notas: string | null
          telefone: string | null
        }
        Insert: {
          activo?: boolean
          categoria: string
          contacto?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome: string
          notas?: string | null
          telefone?: string | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          contacto?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      presencas: {
        Row: {
          convidado_id: string
          id: string
          marcado_em: string
          sessao_id: string
        }
        Insert: {
          convidado_id: string
          id?: string
          marcado_em?: string
          sessao_id: string
        }
        Update: {
          convidado_id?: string
          id?: string
          marcado_em?: string
          sessao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presencas_convidado_id_fkey"
            columns: ["convidado_id"]
            isOneToOne: false
            referencedRelation: "convidados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presencas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_alteracoes: {
        Row: {
          campo: string
          criado_em: string
          id: string
          motivo: string | null
          notificado_cliente: boolean
          reserva_id: string
          staff_nome: string | null
          staff_user_id: string | null
          urgente: boolean
          valor_antigo: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          criado_em?: string
          id?: string
          motivo?: string | null
          notificado_cliente?: boolean
          reserva_id: string
          staff_nome?: string | null
          staff_user_id?: string | null
          urgente?: boolean
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          criado_em?: string
          id?: string
          motivo?: string | null
          notificado_cliente?: boolean
          reserva_id?: string
          staff_nome?: string | null
          staff_user_id?: string | null
          urgente?: boolean
          valor_antigo?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reserva_alteracoes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_alteracoes_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_servicos: {
        Row: {
          criado_em: string
          estado: string
          id: string
          notas: string | null
          preco_unit: number
          quantidade: number
          reserva_id: string
          servico_id: string
          subtotal: number
        }
        Insert: {
          criado_em?: string
          estado?: string
          id?: string
          notas?: string | null
          preco_unit?: number
          quantidade?: number
          reserva_id: string
          servico_id: string
          subtotal?: number
        }
        Update: {
          criado_em?: string
          estado?: string
          id?: string
          notas?: string | null
          preco_unit?: number
          quantidade?: number
          reserva_id?: string
          servico_id?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "reserva_servicos_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          alteracao_urgente: boolean
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
          comprovativo_em: string | null
          comprovativo_url: string | null
          criado_em: string
          data_evento: string
          design_convite: Json | null
          entidade_pagamento: string
          espaco_id: string | null
          evento_nome: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          local_evento: Json | null
          max_convidados: number | null
          mensagem_boas_vindas: string | null
          metodo_pagamento: string | null
          pacote_id: string
          periodo: string
          periodos: string[]
          referencia_pagamento: string
          status: string
          tipo_evento: string
          valor_total: number | null
        }
        Insert: {
          alteracao_urgente?: boolean
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
          comprovativo_em?: string | null
          comprovativo_url?: string | null
          criado_em?: string
          data_evento: string
          design_convite?: Json | null
          entidade_pagamento?: string
          espaco_id?: string | null
          evento_nome?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local_evento?: Json | null
          max_convidados?: number | null
          mensagem_boas_vindas?: string | null
          metodo_pagamento?: string | null
          pacote_id: string
          periodo: string
          periodos?: string[]
          referencia_pagamento: string
          status?: string
          tipo_evento: string
          valor_total?: number | null
        }
        Update: {
          alteracao_urgente?: boolean
          cliente_email?: string
          cliente_nome?: string
          cliente_telefone?: string
          comprovativo_em?: string | null
          comprovativo_url?: string | null
          criado_em?: string
          data_evento?: string
          design_convite?: Json | null
          entidade_pagamento?: string
          espaco_id?: string | null
          evento_nome?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local_evento?: Json | null
          max_convidados?: number | null
          mensagem_boas_vindas?: string | null
          metodo_pagamento?: string | null
          pacote_id?: string
          periodo?: string
          periodos?: string[]
          referencia_pagamento?: string
          status?: string
          tipo_evento?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_espaco_id_fkey"
            columns: ["espaco_id"]
            isOneToOne: false
            referencedRelation: "espacos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          activo: boolean
          categoria: string
          criado_em: string
          descricao: string | null
          fornecedor_id: string | null
          id: string
          imagem_url: string | null
          nome: string
          preco_base: number
          unidade: string
        }
        Insert: {
          activo?: boolean
          categoria: string
          criado_em?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          preco_base?: number
          unidade?: string
        }
        Update: {
          activo?: boolean
          categoria?: string
          criado_em?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          preco_base?: number
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes: {
        Row: {
          criado_em: string
          data: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          ordem: number
          reserva_id: string
          titulo: string
        }
        Insert: {
          criado_em?: string
          data: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          ordem?: number
          reserva_id: string
          titulo?: string
        }
        Update: {
          criado_em?: string
          data?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          ordem?: number
          reserva_id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_log: {
        Row: {
          accao: string
          criado_em: string
          entidade: string | null
          entidade_id: string | null
          id: string
          payload: Json | null
          staff_user_id: string | null
        }
        Insert: {
          accao: string
          criado_em?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          staff_user_id?: string | null
        }
        Update: {
          accao?: string
          criado_em?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          payload?: Json | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_audit_log_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_auth_codes: {
        Row: {
          code_hash: string
          criado_em: string
          expires_at: string
          id: string
          ip: string | null
          staff_user_id: string
          tentativas: number
          used_at: string | null
          user_agent: string | null
        }
        Insert: {
          code_hash: string
          criado_em?: string
          expires_at: string
          id?: string
          ip?: string | null
          staff_user_id: string
          tentativas?: number
          used_at?: string | null
          user_agent?: string | null
        }
        Update: {
          code_hash?: string
          criado_em?: string
          expires_at?: string
          id?: string
          ip?: string | null
          staff_user_id?: string
          tentativas?: number
          used_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_auth_codes_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_sessions: {
        Row: {
          criado_em: string
          expires_at: string
          id: string
          revogado_em: string | null
          staff_user_id: string
          token_hash: string
        }
        Insert: {
          criado_em?: string
          expires_at: string
          id?: string
          revogado_em?: string | null
          staff_user_id: string
          token_hash: string
        }
        Update: {
          criado_em?: string
          expires_at?: string
          id?: string
          revogado_em?: string | null
          staff_user_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_sessions_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          activo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          papel: string
          telefone: string | null
        }
        Insert: {
          activo?: boolean
          criado_em?: string
          email: string
          id?: string
          nome: string
          papel?: string
          telefone?: string | null
        }
        Update: {
          activo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          papel?: string
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
