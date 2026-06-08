
# Sugestões de evolução para a plataforma AGD Eventos

Com base no estado atual (reservas + planos Prata/Ouro, dashboard do cliente, convites com QR, check-in único, AI de templates, sincronização realtime), proponho a roadmap abaixo agrupada por tema. Inclui resposta direta à tua pergunta sobre **check-in recorrente para cursos/formações** (sim, é totalmente possível e está como item 3.1).

---

## 1. Receita & Comercial

**1.1 Novo plano "Bronze" + add-ons à la carte**
Plano de entrada mais barato (só espaço + horários) e add-ons opcionais ao fechar reserva: som, projector, decoração extra, protocolo, fotógrafo, catering. Permite upsell mesmo em planos baixos.

**1.2 Pagamento parcial / sinal de reserva**
Permitir confirmar reserva com 30–50% do valor (sinal) e cobrar o restante até X dias antes do evento. Aumenta conversão (cliente não precisa do valor total à cabeça) e protege a AGD com política de cancelamento.

**1.3 Cupões e códigos promocionais**
Tabela `cupoes` (código, desconto %, validade, usos máx). Aplicável no checkout — útil para parcerias, primeiras reservas e campanhas sazonais.

**1.4 Marketplace de fornecedores**
Catálogo público de parceiros (DJs, fotógrafos, decoradores, catering) que o cliente pode contratar dentro da plataforma. AGD pode cobrar comissão.

---

## 2. Operação Multi-Espaços & Multi-Serviços

**2.1 Múltiplos espaços/recintos**
Nova tabela `espacos` (nome, endereço, capacidade, horários, preços). Cada reserva passa a referenciar um `espaco_id`. Calendário de disponibilidade calcula por espaço. Painel admin filtra por espaço.

**2.2 Gestão de equipa / staff**
Tabela `staff_users` com perfis: super-admin, gerente de espaço, operador de check-in, financeiro. Cada um vê apenas o que lhe compete. Usar `user_roles` + `has_role()` conforme convenção segura.

**2.3 Catálogo de serviços integrados**
Cliente seleciona serviços adicionais na reserva ou no dashboard; cada serviço tem fornecedor responsável (interno ou externo). Estado: solicitado → aceite → entregue.

**2.4 Calendário operacional unificado**
Vista semanal/mensal estilo "kanban" para o staff: eventos do dia, espaços ocupados, tarefas pendentes (decorar, montar som, limpar). Drag & drop entre estados.

---

## 3. Experiência (Cliente final & Convidados)

**3.1 Check-in recorrente para cursos/formações — SIM, fazível ✓**
Resposta directa à tua pergunta. Modelo proposto:

```text
sessoes (id, reserva_id, data, hora_inicio, titulo, obrigatoria)
presencas (id, convidado_id, sessao_id, marcado_em, marcado_por)
```

- Ao criar reserva do tipo `curso`/`treinamento`/`seminario`, o cliente define no dashboard quantas sessões/datas tem o curso (ex: 10 aulas, 5 módulos).
- O **mesmo QR code do participante** funciona para todas as sessões — o sistema sabe qual sessão está activa pelo dia/hora actual (ou selecionável pelo operador).
- Página `/admin/checkin` ganha selector "Sessão de hoje" + relatório de assiduidade (% presença por aluno, faltas consecutivas, certificado automático se ≥ 75%).
- Exportação CSV de pauta de presenças por sessão e geral.

**3.2 Lembretes automáticos (cron + WhatsApp/SMS)**
Job diário via `pg_cron` → `/api/public/hooks/lembretes`:
- 7 dias antes: lembrete ao cliente para finalizar lista de convidados.
- 2 dias antes: lembrete aos convidados (já tens infra Twilio).
- 1h após o evento: pedido de feedback / avaliação.

**3.3 RSVP dos convidados**
Página do convite com botão "Confirmo presença / Não poderei ir / +1 acompanhante". Cliente vê na hora quem confirmou. Reduz no-shows.

**3.4 Galeria pós-evento**
Bucket `event-photos` por reserva. Convidados acedem com o mesmo link/QR e descarregam fotos. Pode ser add-on pago.

**3.5 Avaliações públicas e prova social**
Após evento → email com link de avaliação (1–5★ + comentário). Avaliações aprovadas aparecem na landing page. Aumenta conversão de novos visitantes.

---

## 4. Inteligência & Automação (Lovable AI)

**4.1 Assistente IA no dashboard do cliente**
Chat lateral que responde dúvidas ("a que horas devo chegar?", "posso mudar a data?"), sugere mensagens de boas-vindas, gera textos de convite no tom desejado (formal/descontraído/religioso), sugere disposição de mesas.

**4.2 Gerador de layout de mesas**
Cliente diz "120 convidados, 8 mesas redondas + 2 VIP" → IA propõe distribuição respeitando famílias/grupos. Editor visual drag-and-drop por cima.

**4.3 Sugestão automática de capacidade & preço**
Ao escolher tipo de evento + número de convidados, IA sugere o melhor pacote e add-ons recomendados.

---

## 5. Confiança, Segurança & Conformidade

**5.1 Autenticação real (Lovable Cloud Auth)**
Hoje admin usa palavra-passe partilhada `agd2026` e cliente usa apenas a referência. Migrar para:
- Cliente: login email/Google + recuperação por OTP SMS (Twilio já configurado).
- Admin/staff: email/password + roles (`super_admin`, `gerente`, `checkin`).
- RLS por `user_id` em vez de políticas `Public ... using:true` (hoje qualquer pessoa com a anon key pode ler/editar tudo).

**5.2 Auditoria**
Tabela `audit_log` (quem fez o quê e quando) para mudanças sensíveis: alteração de status de pagamento, edição de reserva, check-ins manuais.

**5.3 Política de cancelamento codificada**
Regras claras (>30 dias = 100% devolvido, 15–30 = 50%, <15 = 0%) aplicadas automaticamente.

---

## 6. Analytics & Negócio

**6.1 Dashboard admin com KPIs**
Receita do mês, eventos confirmados vs pendentes, taxa de conversão (reservas criadas → pagas), pacote mais vendido, ocupação por espaço, no-show rate.

**6.2 Relatórios exportáveis**
PDF/Excel de relatório financeiro mensal, lista de presenças, mapa de eventos do mês.

---

## 7. Marketing & SEO

**7.1 Páginas dedicadas por tipo de evento**
`/casamentos`, `/formacoes`, `/eventos-corporativos` com SEO próprio (title, meta, OG image, JSON-LD). Hoje só existe landing genérica.

**7.2 Blog / casos de sucesso**
Conteúdo orgânico para captar tráfego ("Como organizar o casamento perfeito no Huambo").

**7.3 Integração WhatsApp Business**
Botão flutuante de contacto directo + respostas rápidas automáticas.

---

## Próximo passo sugerido

Quando consultares a AGD, recolhe respostas a:
1. Quais destes blocos têm prioridade real? (Sugiro começar por **5.1 Auth real** + **3.1 Check-in recorrente** + **2.1 Múltiplos espaços** — são fundações para tudo o resto.)
2. Há já fornecedores parceiros para o marketplace (item 1.4 / 2.3)?
3. Existe política de cancelamento e tabela de preços de add-ons para codificar?

Diz-me por onde queres avançar e eu detalho um plano de implementação focado.
