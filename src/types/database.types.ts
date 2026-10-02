
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "agendamento": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"cancelado_por": string | null,"cliente_id": string,"criado_em": string | null,"data_hora": string,"data_hora_fim": string,"id": string,"lembrete_24h_em": string | null,"lembrete_2h_em": string | null,"observacoes": string | null,"profissional_id": string,"status": Database["public"]['Enums']["status_agendamento"] | null
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"cancelado_por"?: string | null,"cliente_id": string,"criado_em"?: string | null,"data_hora": string,"data_hora_fim": string,"id"?: string,"lembrete_24h_em"?: string | null,"lembrete_2h_em"?: string | null,"observacoes"?: string | null,"profissional_id": string,"status"?: Database["public"]['Enums']["status_agendamento"] | null
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"cancelado_por"?: string | null,"cliente_id"?: string,"criado_em"?: string | null,"data_hora"?: string,"data_hora_fim"?: string,"id"?: string,"lembrete_24h_em"?: string | null,"lembrete_2h_em"?: string | null,"observacoes"?: string | null,"profissional_id"?: string,"status"?: Database["public"]['Enums']["status_agendamento"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agendamento_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_cliente_id_fkey"
      columns: ["cliente_id"]
isOneToOne: false
      referencedRelation: "cliente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    }
                  ]
                },"agendamento_servico": {
                  Row: {
                    "agendamento_id": string,"preco_cobrado": number,"servico_id": string
                  }
                  Insert: {
                    "agendamento_id": string,"preco_cobrado": number,"servico_id": string
                  }
                  Update: {
                    "agendamento_id"?: string,"preco_cobrado"?: number,"servico_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agendamento_servico_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_servico_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "meus_agendamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_servico_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_servico_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servico_publico"
      referencedColumns: ["id"]
    }
                  ]
                },"auditoria_plataforma": {
                  Row: {
                    "acao": string,"admin_id": string | null,"alvo_descricao": string | null,"alvo_id": string,"alvo_tipo": string,"criado_em": string,"dados_anteriores": Json | null,"dados_novos": Json | null,"id": string,"motivo": string | null
                  }
                  Insert: {
                    "acao": string,"admin_id"?: string | null,"alvo_descricao"?: string | null,"alvo_id": string,"alvo_tipo": string,"criado_em"?: string,"dados_anteriores"?: Json | null,"dados_novos"?: Json | null,"id"?: string,"motivo"?: string | null
                  }
                  Update: {
                    "acao"?: string,"admin_id"?: string | null,"alvo_descricao"?: string | null,"alvo_id"?: string,"alvo_tipo"?: string,"criado_em"?: string,"dados_anteriores"?: Json | null,"dados_novos"?: Json | null,"id"?: string,"motivo"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"barbearia": {
                  Row: {
                    "cidade": string | null,"criado_em": string | null,"criado_por": string | null,"estado": string | null,"fuso_horario": string,"id": string,"listada_no_catalogo": boolean,"nome": string,"slug": string,"status": string
                  }
                  Insert: {
                    "cidade"?: string | null,"criado_em"?: string | null,"criado_por"?: string | null,"estado"?: string | null,"fuso_horario"?: string,"id"?: string,"listada_no_catalogo"?: boolean,"nome": string,"slug": string,"status"?: string
                  }
                  Update: {
                    "cidade"?: string | null,"criado_em"?: string | null,"criado_por"?: string | null,"estado"?: string | null,"fuso_horario"?: string,"id"?: string,"listada_no_catalogo"?: boolean,"nome"?: string,"slug"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "barbearia_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"bloqueio": {
                  Row: {
                    "barbearia_id": string,"criado_em": string | null,"data_hora_fim": string,"data_hora_inicio": string,"id": string,"motivo": string | null,"profissional_id": string | null,"solicitado_por": string | null,"status_aprovacao": Database["public"]['Enums']["status_aprovacao"]
                  }
                  Insert: {
                    "barbearia_id": string,"criado_em"?: string | null,"data_hora_fim": string,"data_hora_inicio": string,"id"?: string,"motivo"?: string | null,"profissional_id"?: string | null,"solicitado_por"?: string | null,"status_aprovacao"?: Database["public"]['Enums']["status_aprovacao"]
                  }
                  Update: {
                    "barbearia_id"?: string,"criado_em"?: string | null,"data_hora_fim"?: string,"data_hora_inicio"?: string,"id"?: string,"motivo"?: string | null,"profissional_id"?: string | null,"solicitado_por"?: string | null,"status_aprovacao"?: Database["public"]['Enums']["status_aprovacao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "bloqueio_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueio_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueio_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueio_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bloqueio_solicitado_por_fkey"
      columns: ["solicitado_por"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"cliente": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"criado_em": string | null,"data_nascimento": string | null,"email": string | null,"id": string,"nome": string,"observacoes": string | null,"status": Database["public"]['Enums']["status_registro"] | null,"telefone": string | null,"usuario_id": string | null
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"criado_em"?: string | null,"data_nascimento"?: string | null,"email"?: string | null,"id"?: string,"nome": string,"observacoes"?: string | null,"status"?: Database["public"]['Enums']["status_registro"] | null,"telefone"?: string | null,"usuario_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"criado_em"?: string | null,"data_nascimento"?: string | null,"email"?: string | null,"id"?: string,"nome"?: string,"observacoes"?: string | null,"status"?: Database["public"]['Enums']["status_registro"] | null,"telefone"?: string | null,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cliente_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cliente_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cliente_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"configuracao_barbearia": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"horario_abertura": string,"horario_fechamento": string,"tema_banner_url": string | null,"tema_cor_primaria": string | null,"tema_descricao": string | null,"tema_logo_url": string | null
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"horario_abertura"?: string,"horario_fechamento"?: string,"tema_banner_url"?: string | null,"tema_cor_primaria"?: string | null,"tema_descricao"?: string | null,"tema_logo_url"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"horario_abertura"?: string,"horario_fechamento"?: string,"tema_banner_url"?: string | null,"tema_cor_primaria"?: string | null,"tema_descricao"?: string | null,"tema_logo_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "configuracao_barbearia_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: true
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "configuracao_barbearia_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: true
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"despesa_recorrente": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"categoria": Database["public"]['Enums']["categoria_lancamento"],"criado_em": string | null,"descricao": string,"dia_vencimento": number,"id": string,"status": Database["public"]['Enums']["status_registro"],"valor": number
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"categoria"?: Database["public"]['Enums']["categoria_lancamento"],"criado_em"?: string | null,"descricao": string,"dia_vencimento": number,"id"?: string,"status"?: Database["public"]['Enums']["status_registro"],"valor": number
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"categoria"?: Database["public"]['Enums']["categoria_lancamento"],"criado_em"?: string | null,"descricao"?: string,"dia_vencimento"?: number,"id"?: string,"status"?: Database["public"]['Enums']["status_registro"],"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "despesa_recorrente_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "despesa_recorrente_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"favorito": {
                  Row: {
                    "agendamento_id": string | null,"barbearia_id": string,"criado_em": string | null,"id": string,"profissional_id": string | null,"servico_id": string | null,"tipo": Database["public"]['Enums']["tipo_favorito"],"usuario_id": string
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"barbearia_id": string,"criado_em"?: string | null,"id"?: string,"profissional_id"?: string | null,"servico_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_favorito"],"usuario_id": string
                  }
                  Update: {
                    "agendamento_id"?: string | null,"barbearia_id"?: string,"criado_em"?: string | null,"id"?: string,"profissional_id"?: string | null,"servico_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_favorito"],"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorito_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "meus_agendamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servico_publico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorito_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"horario_trabalho": {
                  Row: {
                    "ativo": boolean,"barbearia_id": string,"criado_em": string | null,"dia_semana": number,"hora_fim": string,"hora_inicio": string,"id": string,"profissional_id": string | null,"solicitado_por": string | null,"status_aprovacao": Database["public"]['Enums']["status_aprovacao"]
                  }
                  Insert: {
                    "ativo"?: boolean,"barbearia_id": string,"criado_em"?: string | null,"dia_semana": number,"hora_fim": string,"hora_inicio": string,"id"?: string,"profissional_id"?: string | null,"solicitado_por"?: string | null,"status_aprovacao"?: Database["public"]['Enums']["status_aprovacao"]
                  }
                  Update: {
                    "ativo"?: boolean,"barbearia_id"?: string,"criado_em"?: string | null,"dia_semana"?: number,"hora_fim"?: string,"hora_inicio"?: string,"id"?: string,"profissional_id"?: string | null,"solicitado_por"?: string | null,"status_aprovacao"?: Database["public"]['Enums']["status_aprovacao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "horario_trabalho_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "horario_trabalho_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "horario_trabalho_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "horario_trabalho_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "horario_trabalho_solicitado_por_fkey"
      columns: ["solicitado_por"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"lancamento_financeiro": {
                  Row: {
                    "agendamento_id": string | null,"barbearia_id": string,"categoria": Database["public"]['Enums']["categoria_lancamento"],"criado_em": string | null,"criado_por": string | null,"data_lancamento": string | null,"descricao": string | null,"despesa_recorrente_id": string | null,"forma_pagamento": Database["public"]['Enums']["forma_pagamento"] | null,"id": string,"profissional_id": string | null,"tipo": Database["public"]['Enums']["tipo_lancamento"],"valor": number
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"barbearia_id": string,"categoria"?: Database["public"]['Enums']["categoria_lancamento"],"criado_em"?: string | null,"criado_por"?: string | null,"data_lancamento"?: string | null,"descricao"?: string | null,"despesa_recorrente_id"?: string | null,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"profissional_id"?: string | null,"tipo": Database["public"]['Enums']["tipo_lancamento"],"valor": number
                  }
                  Update: {
                    "agendamento_id"?: string | null,"barbearia_id"?: string,"categoria"?: Database["public"]['Enums']["categoria_lancamento"],"criado_em"?: string | null,"criado_por"?: string | null,"data_lancamento"?: string | null,"descricao"?: string | null,"despesa_recorrente_id"?: string | null,"forma_pagamento"?: Database["public"]['Enums']["forma_pagamento"] | null,"id"?: string,"profissional_id"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_lancamento"],"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lancamento_financeiro_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "meus_agendamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_criado_por_fkey"
      columns: ["criado_por"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_despesa_recorrente_id_fkey"
      columns: ["despesa_recorrente_id"]
isOneToOne: false
      referencedRelation: "despesa_recorrente"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lancamento_financeiro_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    }
                  ]
                },"notificacao": {
                  Row: {
                    "agendamento_id": string | null,"criado_em": string,"id": string,"lida": boolean,"link_acao": string | null,"mensagem": string | null,"tipo": string,"titulo": string,"usuario_id": string
                  }
                  Insert: {
                    "agendamento_id"?: string | null,"criado_em"?: string,"id"?: string,"lida"?: boolean,"link_acao"?: string | null,"mensagem"?: string | null,"tipo"?: string,"titulo": string,"usuario_id": string
                  }
                  Update: {
                    "agendamento_id"?: string | null,"criado_em"?: string,"id"?: string,"lida"?: boolean,"link_acao"?: string | null,"mensagem"?: string | null,"tipo"?: string,"titulo"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notificacao_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamento"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacao_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "meus_agendamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notificacao_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"produto": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"criado_em": string | null,"descricao": string | null,"id": string,"imagem_url": string | null,"nome": string,"ordem": number,"preco": number,"quantidade": number,"status": Database["public"]['Enums']["status_registro"] | null
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"criado_em"?: string | null,"descricao"?: string | null,"id"?: string,"imagem_url"?: string | null,"nome": string,"ordem"?: number,"preco": number,"quantidade"?: number,"status"?: Database["public"]['Enums']["status_registro"] | null
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"criado_em"?: string | null,"descricao"?: string | null,"id"?: string,"imagem_url"?: string | null,"nome"?: string,"ordem"?: number,"preco"?: number,"quantidade"?: number,"status"?: Database["public"]['Enums']["status_registro"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"profissional": {
                  Row: {
                    "atualizado_em": string | null,"avatar_url": string | null,"barbearia_id": string,"bio": string | null,"comissao_percentual": number,"criado_em": string | null,"email": string | null,"especialidade": string | null,"id": string,"nome": string,"status": Database["public"]['Enums']["status_registro"] | null,"telefone": string | null,"usuario_id": string | null
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"avatar_url"?: string | null,"barbearia_id": string,"bio"?: string | null,"comissao_percentual"?: number,"criado_em"?: string | null,"email"?: string | null,"especialidade"?: string | null,"id"?: string,"nome": string,"status"?: Database["public"]['Enums']["status_registro"] | null,"telefone"?: string | null,"usuario_id"?: string | null
                  }
                  Update: {
                    "atualizado_em"?: string | null,"avatar_url"?: string | null,"barbearia_id"?: string,"bio"?: string | null,"comissao_percentual"?: number,"criado_em"?: string | null,"email"?: string | null,"especialidade"?: string | null,"id"?: string,"nome"?: string,"status"?: Database["public"]['Enums']["status_registro"] | null,"telefone"?: string | null,"usuario_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profissional_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profissional_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profissional_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"promocao": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"criado_em": string | null,"data_fim": string,"data_inicio": string,"desconto_percentual": number,"descricao": string | null,"id": string,"regras": string | null,"status": Database["public"]['Enums']["status_registro"] | null,"titulo": string
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"criado_em"?: string | null,"data_fim": string,"data_inicio": string,"desconto_percentual": number,"descricao"?: string | null,"id"?: string,"regras"?: string | null,"status"?: Database["public"]['Enums']["status_registro"] | null,"titulo": string
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"criado_em"?: string | null,"data_fim"?: string,"data_inicio"?: string,"desconto_percentual"?: number,"descricao"?: string | null,"id"?: string,"regras"?: string | null,"status"?: Database["public"]['Enums']["status_registro"] | null,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "promocao_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "promocao_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"servico": {
                  Row: {
                    "atualizado_em": string | null,"barbearia_id": string,"categoria": Database["public"]['Enums']["categoria_servico"],"criado_em": string | null,"descricao": string | null,"duracao_minutos": number,"id": string,"imagem_url": string | null,"nome": string,"ordem": number,"preco": number,"status": Database["public"]['Enums']["status_registro"] | null
                  }
                  Insert: {
                    "atualizado_em"?: string | null,"barbearia_id": string,"categoria"?: Database["public"]['Enums']["categoria_servico"],"criado_em"?: string | null,"descricao"?: string | null,"duracao_minutos": number,"id"?: string,"imagem_url"?: string | null,"nome": string,"ordem"?: number,"preco": number,"status"?: Database["public"]['Enums']["status_registro"] | null
                  }
                  Update: {
                    "atualizado_em"?: string | null,"barbearia_id"?: string,"categoria"?: Database["public"]['Enums']["categoria_servico"],"criado_em"?: string | null,"descricao"?: string | null,"duracao_minutos"?: number,"id"?: string,"imagem_url"?: string | null,"nome"?: string,"ordem"?: number,"preco"?: number,"status"?: Database["public"]['Enums']["status_registro"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "servico_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servico_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"solicitacao_jornada": {
                  Row: {
                    "barbearia_id": string,"criado_em": string,"dia_semana": number | null,"hora_fim": string | null,"hora_inicio": string | null,"horario_id": string | null,"id": string,"operacao": string,"profissional_id": string,"respondido_em": string | null,"respondido_por": string | null,"solicitado_por": string | null,"status": Database["public"]['Enums']["status_aprovacao"]
                  }
                  Insert: {
                    "barbearia_id": string,"criado_em"?: string,"dia_semana"?: number | null,"hora_fim"?: string | null,"hora_inicio"?: string | null,"horario_id"?: string | null,"id"?: string,"operacao": string,"profissional_id": string,"respondido_em"?: string | null,"respondido_por"?: string | null,"solicitado_por"?: string | null,"status"?: Database["public"]['Enums']["status_aprovacao"]
                  }
                  Update: {
                    "barbearia_id"?: string,"criado_em"?: string,"dia_semana"?: number | null,"hora_fim"?: string | null,"hora_inicio"?: string | null,"horario_id"?: string | null,"id"?: string,"operacao"?: string,"profissional_id"?: string,"respondido_em"?: string | null,"respondido_por"?: string | null,"solicitado_por"?: string | null,"status"?: Database["public"]['Enums']["status_aprovacao"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitacao_jornada_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_jornada_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_jornada_horario_id_fkey"
      columns: ["horario_id"]
isOneToOne: false
      referencedRelation: "horario_trabalho"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_jornada_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_jornada_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_jornada_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solicitacao_jornada_solicitado_por_fkey"
      columns: ["solicitado_por"]
isOneToOne: false
      referencedRelation: "usuario_perfil"
      referencedColumns: ["id"]
    }
                  ]
                },"usuario_perfil": {
                  Row: {
                    "barbearia_id": string | null,"criado_em": string | null,"id": string,"nome": string,"status": string,"tipo": Database["public"]['Enums']["tipo_usuario"]
                  }
                  Insert: {
                    "barbearia_id"?: string | null,"criado_em"?: string | null,"id": string,"nome": string,"status"?: string,"tipo"?: Database["public"]['Enums']["tipo_usuario"]
                  }
                  Update: {
                    "barbearia_id"?: string | null,"criado_em"?: string | null,"id"?: string,"nome"?: string,"status"?: string,"tipo"?: Database["public"]['Enums']["tipo_usuario"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "usuario_perfil_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "usuario_perfil_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "barbearia_publica": {
                  Row: {
                    "banner_url": string | null,"cidade": string | null,"cor_primaria": string | null,"descricao": string | null,"estado": string | null,"id": string | null,"logo_url": string | null,"nome": string | null,"perfil_completude": number | null,"slug": string | null
                  }
                  Relationships: [
                    
                  ]
                },"meus_agendamentos": {
                  Row: {
                    "barbearia_id": string | null,"barbearia_nome": string | null,"barbearia_slug": string | null,"criado_em": string | null,"data_hora": string | null,"data_hora_fim": string | null,"id": string | null,"profissional_id": string | null,"profissional_nome": string | null,"status": Database["public"]['Enums']["status_agendamento"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agendamento_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamento_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissional_publico"
      referencedColumns: ["id"]
    }
                  ]
                },"produto_publico": {
                  Row: {
                    "barbearia_id": string | null,"descricao": string | null,"id": string | null,"imagem_url": string | null,"nome": string | null,"ordem": number | null,"preco": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "produto_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"profissional_publico": {
                  Row: {
                    "avatar_url": string | null,"barbearia_id": string | null,"bio": string | null,"especialidade": string | null,"id": string | null,"nome": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profissional_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profissional_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"promocao_publica": {
                  Row: {
                    "barbearia_id": string | null,"data_fim": string | null,"data_inicio": string | null,"desconto_percentual": number | null,"descricao": string | null,"id": string | null,"regras": string | null,"titulo": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "promocao_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "promocao_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                },"servico_publico": {
                  Row: {
                    "barbearia_id": string | null,"categoria": Database["public"]['Enums']["categoria_servico"] | null,"descricao": string | null,"duracao_minutos": number | null,"id": string | null,"imagem_url": string | null,"nome": string | null,"ordem": number | null,"preco": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "servico_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "servico_barbearia_id_fkey"
      columns: ["barbearia_id"]
isOneToOne: false
      referencedRelation: "barbearia_publica"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "adicionar_gestor":
{ Args: { "p_barbearia_id"?: string,"p_email": string,"p_nome"?: string,"p_tipo"?: Database["public"]['Enums']["tipo_usuario"] }; Returns: string
                           },
"admin_definir_status_barbearia":
{ Args: { "p_barbearia_id": string,"p_motivo"?: string,"p_status": string }; Returns: undefined
                           },
"admin_definir_status_usuario":
{ Args: { "p_motivo"?: string,"p_status": string,"p_usuario_id": string }; Returns: undefined
                           },
"agendar_como_cliente":
{ Args: { "p_barbearia_id": string,"p_data_hora": string,"p_observacoes"?: string,"p_profissional_id": string,"p_servico_ids": (string)[] }; Returns: string
                           },
"alterar_papel_gestor":
{ Args: { "p_novo_tipo": Database["public"]['Enums']["tipo_usuario"],"p_usuario_id": string }; Returns: undefined
                           },
"cadastrar_cliente_com_conta":
{ Args: { "p_barbearia_id": string,"p_data_nascimento"?: string,"p_email"?: string,"p_nome": string,"p_observacoes"?: string,"p_telefone"?: string }; Returns: {
              "cliente_id": string,"conta_vinculada": boolean,"usuario_id": string
            }[]
                           },
"cadastrar_profissional_com_conta":
{ Args: { "p_barbearia_id": string,"p_bio"?: string,"p_comissao_percentual"?: number,"p_email"?: string,"p_especialidade"?: string,"p_nome": string,"p_telefone"?: string }; Returns: {
              "conta_vinculada": boolean,"profissional_id": string,"usuario_id": string
            }[]
                           },
"categoria_permitida_ao_profissional":
{ Args: { "p_categoria": Database["public"]['Enums']["categoria_lancamento"] }; Returns: boolean
                           },
"checar_acesso_barbearia":
{ Args: { "p_barbearia_id": string }; Returns: undefined
                           },
"checar_gestao_de_acesso":
{ Args: { "p_barbearia_id": string }; Returns: undefined
                           },
"conta_suspensa":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"criar_barbearia_e_vincular":
{ Args: { "p_nome": string }; Returns: string
                           },
"criar_notificacao":
{ Args: { "p_agendamento_id"?: string,"p_link"?: string,"p_mensagem": string,"p_mesmo_para_o_autor"?: boolean,"p_tipo"?: string,"p_titulo": string,"p_usuario_id": string }; Returns: undefined
                           },
"enviar_lembretes_de_agendamento":
{ Args: Record<PropertyKey, never>; Returns: {
              "enviados_24h": number,"enviados_2h": number
            }[]
                           },
"enviar_resumo_da_agenda_de_amanha":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"formatar_dinheiro":
{ Args: { "p_valor": number }; Returns: string
                           },
"formatar_percentual":
{ Args: { "p_valor": number }; Returns: string
                           },
"get_barbearia_do_usuario":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"get_profissional_id_do_usuario":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_admin_supremo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_gestor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"ocupacao_publica":
{ Args: { "p_dia_semana": number,"p_fim": string,"p_inicio": string,"p_profissional_id": string }; Returns: Json
                           },
"perfil_por_email":
{ Args: { "p_email": string }; Returns: string
                           },
"remover_gestor":
{ Args: { "p_usuario_id": string }; Returns: undefined
                           },
"responder_solicitacao_jornada":
{ Args: { "p_solicitacao_id": string,"p_status": string }; Returns: undefined
                           },
"slug_disponivel":
{ Args: { "p_id"?: string,"p_nome": string }; Returns: string
                           },
"slugificar":
{ Args: { "p_texto": string }; Returns: string
                           }
          }
          Enums: {
            "categoria_lancamento": "atendimento"|"venda_produto"|"aluguel"|"insumos"|"salario"|"comissao"|"outro","categoria_servico": "corte"|"barba"|"combo"|"quimica"|"estetica"|"infantil"|"outro","forma_pagamento": "dinheiro"|"pix"|"credito"|"debito"|"outro","status_agendamento": "pendente"|"confirmado"|"em_atendimento"|"concluido"|"cancelado"|"faltou","status_aprovacao": "pendente"|"aprovado"|"rejeitado","status_registro": "ativo"|"inativo","tipo_favorito": "barbearia"|"servico_profissional"|"agendamento","tipo_lancamento": "entrada"|"saida","tipo_usuario": "admin_supremo"|"owner"|"cliente"|"profissional"|"gerente"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "categoria_lancamento": ["atendimento", "venda_produto", "aluguel", "insumos", "salario", "comissao", "outro"],"categoria_servico": ["corte", "barba", "combo", "quimica", "estetica", "infantil", "outro"],"forma_pagamento": ["dinheiro", "pix", "credito", "debito", "outro"],"status_agendamento": ["pendente", "confirmado", "em_atendimento", "concluido", "cancelado", "faltou"],"status_aprovacao": ["pendente", "aprovado", "rejeitado"],"status_registro": ["ativo", "inativo"],"tipo_favorito": ["barbearia", "servico_profissional", "agendamento"],"tipo_lancamento": ["entrada", "saida"],"tipo_usuario": ["admin_supremo", "owner", "cliente", "profissional", "gerente"]
          }
        }
} as const
