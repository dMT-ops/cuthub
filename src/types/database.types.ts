export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agendamento: {
        Row: {
          atualizado_em: string | null
          barbearia_id: string
          cancelado_por: string | null
          cliente_id: string
          criado_em: string | null
          data_hora: string
          data_hora_fim: string
          id: string
          observacoes: string | null
          profissional_id: string
          status: Database["public"]["Enums"]["status_agendamento"] | null
        }
        Insert: {
          atualizado_em?: string | null
          barbearia_id: string
          cancelado_por?: string | null
          cliente_id: string
          criado_em?: string | null
          data_hora: string
          data_hora_fim: string
          id?: string
          observacoes?: string | null
          profissional_id: string
          status?: Database["public"]["Enums"]["status_agendamento"] | null
        }
        Update: {
          atualizado_em?: string | null
          barbearia_id?: string
          cancelado_por?: string | null
          cliente_id?: string
          criado_em?: string | null
          data_hora?: string
          data_hora_fim?: string
          id?: string
          observacoes?: string | null
          profissional_id?: string
          status?: Database["public"]["Enums"]["status_agendamento"] | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissional"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamento_servico: {
        Row: {
          agendamento_id: string
          preco_cobrado: number
          servico_id: string
        }
        Insert: {
          agendamento_id: string
          preco_cobrado: number
          servico_id: string
        }
        Update: {
          agendamento_id?: string
          preco_cobrado?: number
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_servico_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_servico_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servico"
            referencedColumns: ["id"]
          },
        ]
      }
      barbearia: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbearia_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuario_perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueio: {
        Row: {
          barbearia_id: string
          criado_em: string | null
          data_hora_fim: string
          data_hora_inicio: string
          id: string
          motivo: string | null
          profissional_id: string | null
        }
        Insert: {
          barbearia_id: string
          criado_em?: string | null
          data_hora_fim: string
          data_hora_inicio: string
          id?: string
          motivo?: string | null
          profissional_id?: string | null
        }
        Update: {
          barbearia_id?: string
          criado_em?: string | null
          data_hora_fim?: string
          data_hora_inicio?: string
          id?: string
          motivo?: string | null
          profissional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bloqueio_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueio_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissional"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente: {
        Row: {
          atualizado_em: string | null
          barbearia_id: string
          criado_em: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_registro"] | null
          telefone: string | null
          usuario_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          barbearia_id: string
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_registro"] | null
          telefone?: string | null
          usuario_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          barbearia_id?: string
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_registro"] | null
          telefone?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario_perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_barbearia: {
        Row: {
          atualizado_em: string | null
          barbearia_id: string
          horario_abertura: string
          horario_fechamento: string
          tema_banner_url: string | null
          tema_cor_primaria: string | null
          tema_descricao: string | null
          tema_logo_url: string | null
        }
        Insert: {
          atualizado_em?: string | null
          barbearia_id: string
          horario_abertura?: string
          horario_fechamento?: string
          tema_banner_url?: string | null
          tema_cor_primaria?: string | null
          tema_descricao?: string | null
          tema_logo_url?: string | null
        }
        Update: {
          atualizado_em?: string | null
          barbearia_id?: string
          horario_abertura?: string
          horario_fechamento?: string
          tema_banner_url?: string | null
          tema_cor_primaria?: string | null
          tema_descricao?: string | null
          tema_logo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracao_barbearia_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: true
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
        ]
      }
      horario_trabalho: {
        Row: {
          ativo: boolean
          barbearia_id: string
          criado_em: string | null
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id: string
          profissional_id: string | null
        }
        Insert: {
          ativo?: boolean
          barbearia_id: string
          criado_em?: string | null
          dia_semana: number
          hora_fim: string
          hora_inicio: string
          id?: string
          profissional_id?: string | null
        }
        Update: {
          ativo?: boolean
          barbearia_id?: string
          criado_em?: string | null
          dia_semana?: number
          hora_fim?: string
          hora_inicio?: string
          id?: string
          profissional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horario_trabalho_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horario_trabalho_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissional"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamento_financeiro: {
        Row: {
          agendamento_id: string | null
          barbearia_id: string
          categoria: Database["public"]["Enums"]["categoria_lancamento"]
          criado_em: string | null
          criado_por: string | null
          data_lancamento: string | null
          descricao: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          profissional_id: string | null
          tipo: Database["public"]["Enums"]["tipo_lancamento"]
          valor: number
        }
        Insert: {
          agendamento_id?: string | null
          barbearia_id: string
          categoria?: Database["public"]["Enums"]["categoria_lancamento"]
          criado_em?: string | null
          criado_por?: string | null
          data_lancamento?: string | null
          descricao?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          profissional_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_lancamento"]
          valor: number
        }
        Update: {
          agendamento_id?: string | null
          barbearia_id?: string
          categoria?: Database["public"]["Enums"]["categoria_lancamento"]
          criado_em?: string | null
          criado_por?: string | null
          data_lancamento?: string | null
          descricao?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          profissional_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_lancamento"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamento_financeiro_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_financeiro_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_financeiro_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuario_perfil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamento_financeiro_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissional"
            referencedColumns: ["id"]
          },
        ]
      }
      profissional: {
        Row: {
          atualizado_em: string | null
          avatar_url: string | null
          barbearia_id: string
          bio: string | null
          comissao_percentual: number
          criado_em: string | null
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["status_registro"] | null
          telefone: string | null
          usuario_id: string | null
        }
        Insert: {
          atualizado_em?: string | null
          avatar_url?: string | null
          barbearia_id: string
          bio?: string | null
          comissao_percentual?: number
          criado_em?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["status_registro"] | null
          telefone?: string | null
          usuario_id?: string | null
        }
        Update: {
          atualizado_em?: string | null
          avatar_url?: string | null
          barbearia_id?: string
          bio?: string | null
          comissao_percentual?: number
          criado_em?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["status_registro"] | null
          telefone?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissional_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissional_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario_perfil"
            referencedColumns: ["id"]
          },
        ]
      }
      servico: {
        Row: {
          atualizado_em: string | null
          barbearia_id: string
          categoria: Database["public"]["Enums"]["categoria_servico"]
          criado_em: string | null
          descricao: string | null
          duracao_minutos: number
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          preco: number
          status: Database["public"]["Enums"]["status_registro"] | null
        }
        Insert: {
          atualizado_em?: string | null
          barbearia_id: string
          categoria?: Database["public"]["Enums"]["categoria_servico"]
          criado_em?: string | null
          descricao?: string | null
          duracao_minutos: number
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          preco: number
          status?: Database["public"]["Enums"]["status_registro"] | null
        }
        Update: {
          atualizado_em?: string | null
          barbearia_id?: string
          categoria?: Database["public"]["Enums"]["categoria_servico"]
          criado_em?: string | null
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          preco?: number
          status?: Database["public"]["Enums"]["status_registro"] | null
        }
        Relationships: [
          {
            foreignKeyName: "servico_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_perfil: {
        Row: {
          barbearia_id: string | null
          criado_em: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_usuario"]
        }
        Insert: {
          barbearia_id?: string | null
          criado_em?: string | null
          id: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
        }
        Update: {
          barbearia_id?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
        }
        Relationships: [
          {
            foreignKeyName: "usuario_perfil_barbearia_id_fkey"
            columns: ["barbearia_id"]
            isOneToOne: false
            referencedRelation: "barbearia"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adicionar_gestor: {
        Args: {
          p_barbearia_id?: string
          p_email: string
          p_nome?: string
          p_tipo?: Database["public"]["Enums"]["tipo_usuario"]
        }
        Returns: string
      }
      alterar_papel_gestor: {
        Args: {
          p_novo_tipo: Database["public"]["Enums"]["tipo_usuario"]
          p_usuario_id: string
        }
        Returns: undefined
      }
      cadastrar_cliente_com_conta: {
        Args: {
          p_barbearia_id: string
          p_data_nascimento?: string
          p_email?: string
          p_nome: string
          p_observacoes?: string
          p_telefone?: string
        }
        Returns: {
          cliente_id: string
          conta_vinculada: boolean
          usuario_id: string
        }[]
      }
      cadastrar_profissional_com_conta: {
        Args: {
          p_barbearia_id: string
          p_bio?: string
          p_comissao_percentual?: number
          p_email?: string
          p_especialidade?: string
          p_nome: string
          p_telefone?: string
        }
        Returns: {
          conta_vinculada: boolean
          profissional_id: string
          usuario_id: string
        }[]
      }
      checar_acesso_barbearia: {
        Args: { p_barbearia_id: string }
        Returns: undefined
      }
      checar_gestao_de_acesso: {
        Args: { p_barbearia_id: string }
        Returns: undefined
      }
      criar_barbearia_e_vincular: { Args: { p_nome: string }; Returns: string }
      get_barbearia_do_usuario: { Args: never; Returns: string }
      is_admin_supremo: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      perfil_por_email: { Args: { p_email: string }; Returns: string }
      remover_gestor: { Args: { p_usuario_id: string }; Returns: undefined }
    }
    Enums: {
      categoria_lancamento:
        | "atendimento"
        | "venda_produto"
        | "aluguel"
        | "insumos"
        | "salario"
        | "comissao"
        | "outro"
      categoria_servico:
        | "corte"
        | "barba"
        | "combo"
        | "quimica"
        | "estetica"
        | "infantil"
        | "outro"
      forma_pagamento: "dinheiro" | "pix" | "credito" | "debito" | "outro"
      status_agendamento:
        | "pendente"
        | "confirmado"
        | "em_atendimento"
        | "concluido"
        | "cancelado"
        | "faltou"
      status_registro: "ativo" | "inativo"
      tipo_lancamento: "entrada" | "saida"
      tipo_usuario:
        | "admin_supremo"
        | "owner"
        | "cliente"
        | "profissional"
        | "gerente"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      categoria_lancamento: [
        "atendimento",
        "venda_produto",
        "aluguel",
        "insumos",
        "salario",
        "comissao",
        "outro",
      ],
      categoria_servico: [
        "corte",
        "barba",
        "combo",
        "quimica",
        "estetica",
        "infantil",
        "outro",
      ],
      forma_pagamento: ["dinheiro", "pix", "credito", "debito", "outro"],
      status_agendamento: [
        "pendente",
        "confirmado",
        "em_atendimento",
        "concluido",
        "cancelado",
        "faltou",
      ],
      status_registro: ["ativo", "inativo"],
      tipo_lancamento: ["entrada", "saida"],
      tipo_usuario: [
        "admin_supremo",
        "owner",
        "cliente",
        "profissional",
        "gerente",
      ],
    },
  },
} as const


// Aliases de conveniência usados pelo projeto (mantidos manualmente)
export type Cliente = Database['public']['Tables']['cliente']['Row'];  
export type ClienteInsert = Database['public']['Tables']['cliente']['Insert'];  
export type Profissional = Database['public']['Tables']['profissional']['Row'];  
export type Servico = Database['public']['Tables']['servico']['Row'];  
export type Agendamento = Database['public']['Tables']['agendamento']['Row'];  
export type LancamentoFinanceiro = Database['public']['Tables']['lancamento_financeiro']['Row'];  
export type StatusAgendamento = Database['public']['Enums']['status_agendamento'];  
export type Barbearia = Database['public']['Tables']['barbearia']['Row']; 
