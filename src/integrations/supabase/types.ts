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
      reservas: {
        Row: {
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
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
          pacote_id: string
          periodo: string
          referencia_pagamento: string
          status: string
          tipo_evento: string
        }
        Insert: {
          cliente_email: string
          cliente_nome: string
          cliente_telefone: string
          criado_em?: string
          data_evento: string
          design_convite?: Json | null
          entidade_pagamento: string
          espaco_id?: string | null
          evento_nome?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local_evento?: Json | null
          max_convidados?: number | null
          mensagem_boas_vindas?: string | null
          pacote_id: string
          periodo: string
          referencia_pagamento: string
          status?: string
          tipo_evento: string
        }
        Update: {
          cliente_email?: string
          cliente_nome?: string
          cliente_telefone?: string
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
          pacote_id?: string
          periodo?: string
          referencia_pagamento?: string
          status?: string
          tipo_evento?: string
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
