# Escopo funcional e evolução

## Problema central

Antes da consulta, a equipe precisa saber se a peça do paciente chegou à clínica e onde encontrá-la. O controle é por peça: um paciente pode ter recebido uma peça e ainda estar aguardando outra. Recebimento físico na clínica e entrega ao paciente são baixas diferentes.

## Procedimentos informados

PPF/lente, PT, protocolo, PPR, onlay e PSI. O controle deve funcionar de um único dente até uma prótese total, com quantidade, dentes e/ou arcada envolvidos. A nomenclatura PSI permanece como informada, sem expansão presumida.

## Etapas operacionais a implementar

1. Registrar paciente, unidade, procedimento/peça, laboratório, numeração e data de envio.
2. Gerar etiqueta para caixa física, estudando reaproveitamento da numeração do laboratório e caixas reutilizáveis.
3. Receber fisicamente a peça, registrar localização e data; não dar baixa apenas por aviso no WhatsApp.
4. Registrar entrega ao paciente sem concluir indevidamente as outras peças dele.
5. Registrar revisão/reenvio, motivo e histórico.
6. Filtrar por laboratório, com acesso externo limitado às próprias peças.
7. Manter tabela editável de valores sugeridos por tipo de peça.

## Agenda e Clinicorp

A primeira tela operacional deverá responder: quem vem hoje, qual peça precisa e se a peça já está na clínica. A integração deve atualizar registros sem duplicar, manter vínculo com a unidade e preservar histórico. Rotas, permissões e disponibilidade dos endpoints do Clinicorp precisam ser verificados antes de implementar. Não há integração Clinicorp ativa nesta versão.

## Pedidos de materiais

A equipe prepara itens e quantidades; Ana aprova e deixa observações; o responsável compra, registra número/protocolo e autoria. A referência funcional é o fluxo de aprovações do LYRVA. Esta etapa ainda está em preparação.

## Decisões pendentes

- Quem confirma definitivamente a entrega: dentista, consultoria ou outro perfil.
- Detalhes da numeração, etiqueta e caixa por laboratório.
- Relação exata de cada peça com a consulta esperada na agenda.
- Se o reenvio exige revisão/desmarcação da consulta; não automatizar cancelamentos sem regra validada.
- Quais dados cada perfil operacional poderá cadastrar ou alterar.

## Detalhamento do controle protético validado em 19/11/2026

O mapeamento de laboratórios, etapas por peça, precificação, impressão de etiquetas/fichas, acesso externo, prioridade por agenda, tetos mensais e proposta de integração ao LYRVA estão descritos em [Laboratórios e peças](laboratorios-e-pecas.md). Trata-se de requisitos para implementação, não de funcionalidade já ativa.
