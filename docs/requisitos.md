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
7. **Precificação adiada:** normalmente manual por etapa-peça, mas não implementar ainda. A Ellis pode ter uma planilha com preços fixos por etapa; verificar antes de decidir a estrutura.

## Agenda e Clinicorp

A primeira tela operacional deverá responder: quem vem hoje, qual peça precisa e se a peça já está na clínica. A integração deve atualizar registros sem duplicar, manter vínculo com a unidade e preservar histórico. Rotas, permissões e disponibilidade dos endpoints do Clinicorp precisam ser verificados antes de implementar. A busca de pacientes para cadastrar uma peça pode ser configurada separadamente, conforme a seção abaixo.

## Pedidos de materiais

O catálogo real já reúne os materiais do PDF da equipe, com busca e filtro em `/painel/materiais`. São 139 cadastros em oito grupos, sem quantidades, preços ou unidades de compra presumidos. Consulte [Catálogo de materiais](materiais.md).

O fluxo de compras permite à equipe solicitar itens e quantidades, à gestão decidir com observação e à equipe registrar número/protocolo e confirmar a entrega. A aprovação da Ana depende do acesso dela com perfil Gestão. O estoque por unidade recebe apenas as quantidades fisicamente confirmadas.

## Decisões pendentes

- Quem confirma definitivamente a entrega: dentista, consultoria ou outro perfil.
- Detalhes da numeração, etiqueta e caixa por laboratório.
- Relação exata de cada peça com a consulta esperada na agenda.
- Se o reenvio exige revisão/desmarcação da consulta; não automatizar cancelamentos sem regra validada.
- Quais dados cada perfil operacional poderá cadastrar ou alterar.
- **Precificação suspensa em 25/11/2026:** confirmar primeiro com a Ellis a possível planilha de preços por etapa; não criar funcionalidade de preços agora.
- Laboratórios nomeados em 25/11/2026: Laboratório Alexandra - Carla; Laboratório Emerson; Laboratório Design - Renan; Laboratório Daiane Mota; Laboratório Eder.

## Detalhamento do controle protético validado em 19/11/2026

O mapeamento de laboratórios, etapas por peça, **decisão de adiar a precificação**, impressão de etiquetas/fichas, acesso externo, prioridade por agenda e propostas futuras de tetos mensais e integração ao LYRVA estão descritos em [Laboratórios e peças](laboratorios-e-pecas.md). Trata-se de requisitos para implementação, não de funcionalidade já ativa.

## Entrega técnica implementada em 25/11/2026

- Cadastro manual de peças ligado ao Supabase e sem precificação.
- Envio, recebimento no laboratório, produção, despacho, recebimento físico na clínica, entrega e revisão com registros auditáveis.
- Estornos de recebimento e entrega com motivo obrigatório.
- Cinco laboratórios informados cadastrados no banco; visibilidade das peças dos laboratórios sujeita a perfil e RLS.
- Etiqueta HTML 60 × 40 mm imprimível pelo navegador, com nome do paciente, tipo, dente/arcada, códigos e três datas.
- Catálogo real de materiais importado do PDF, com pesquisa, versões, filtro por grupo e rastreabilidade da origem. Sem acesso por laboratório externo.
- Busca de paciente Clinicorp no cadastro de peças, condicionada à configuração da unidade. Agenda do Clinicorp e integração LYRVA permanecem pendentes.
- A liberação operacional depende de testes de navegador publicado, impressora e usuários autorizados.

## Busca de paciente para cadastro de peça

Em **Peças → Cadastrar nova peça**, escolha a unidade e busque pelo nome completo ou ID do Clinicorp. Selecione o resultado para preencher o nome e o ID na peça. A consulta usa `GET /patient/get` e guarda somente os dados previstos no cadastro da peça. A busca não cria cadastro no Clinicorp, e o preenchimento manual permanece disponível. A agenda e a importação automática de peças são integrações separadas.

### Configurar a conexão

No projeto Vercel do CPE, configure `CLINICORP_UNIT_CONFIG` como variável sensível de servidor no ambiente de produção, com o UUID de cada unidade do CPE e as credenciais de leitura do assinante correspondente. O formato está em `.env.example`. A configuração é por UUID porque a API busca pacientes no assinante, sem filtro de unidade no endpoint. Quando duas unidades usam o mesmo assinante, o Clinicorp pode retornar o mesmo cadastro para ambas. Escolha a unidade da peça conforme o atendimento. Depois de configurar a variável, publique uma nova versão para ativá-la.
