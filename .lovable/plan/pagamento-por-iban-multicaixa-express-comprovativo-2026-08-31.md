# Pagamento por IBAN / Multicaixa Express + comprovativo

Substituir a referência Multicaixa (entidade + referência) por pagamento manual: o cliente escolhe **Transferência IBAN** ou **Multicaixa Express**, vê os dados da AGD e carrega obrigatoriamente o comprovativo antes de concluir a reserva. A referência de 9 dígitos continua a existir, mas apenas como **código de gestão do evento** (localizar a reserva em "Minha reserva").

## Passo 4 do formulário (público)

- Escolha do método em dois cartões:
  - **Transferência IBAN** — IBAN `0040.0000.2456.6626.1024.7`, Titular `Abréu G.Daniel - Comercial Lda`, Banco `BAI`, com botão copiar.
  - **Multicaixa Express** — número `925788112`, com botão copiar.
- Valor a pagar em destaque (preço do pacote).
- Campo de upload do comprovativo (imagem ou PDF, até ~5 MB) — **obrigatório**: o botão de concluir só fica ativo depois do ficheiro carregado.
- Depois de submeter: confirmação com o **código de gestão do evento** (a referência atual) e explicação de que a AGD valida o comprovativo e ativa o pacote.
- Sai o texto "Pagamento por Referência Multicaixa"/"Entidade" desta página.

## Área do cliente ("Minha reserva")

- O bloco de pagamento passa a mostrar o método escolhido, os dados usados, o comprovativo carregado (link/pré-visualização) e o estado ("Em validação" / "Pagamento confirmado").
- Permite substituir o comprovativo enquanto a reserva estiver Pendente.
- A referência aparece rotulada como "Código do evento".

## Backoffice

- Na lista/detalhe da reserva: método de pagamento, link para abrir o comprovativo e o valor, junto ao botão "Confirmar Pagamento" já existente.
- Botão **"Enviar código por WhatsApp"** que abre `wa.me` para o número do cliente com mensagem pronta (nome do evento, data, código de gestão e link direto para a página da reserva).
- Nova página **Admin → Definições de pagamento** para editar IBAN, titular, banco, número Express e instruções — os valores mostrados ao cliente vêm daqui.

## Notas técnicas

- Migração: tabela `config_pagamento` (linha única: iban, titular, banco, express_numero, instrucoes) com leitura pública e escrita apenas via service role; colunas novas em `reservas`: `metodo_pagamento` (`iban` | `express`), `comprovativo_url`, `comprovativo_em`. `entidade_pagamento` deixa de ser usada na UI (mantida na base de dados para não quebrar registos antigos, com valor por omissão).
- Upload reutiliza `sfUploadAsset` (bucket `event-assets`), com nova pasta `comprovativos/` e suporte a PDF.
- Novas server functions em `src/lib/data.functions.ts`: ler/atualizar `config_pagamento` e anexar comprovativo à reserva.
- `Store.criarReserva` continua a gerar a referência de 9 dígitos (código de gestão); mensagem WhatsApp construída em `src/lib/whatsapp.ts`.
