# Controle Protético e Laboratórios — requisitos operacionais

**Projeto:** STERYA / CEO Club CPE  
**Origem:** validação operacional com a equipe da Casal Odonto em 19/11/2026.  
**Estado deste documento:** requisitos coletados e propostas de implementação; não implica funcionalidades já publicadas.

## 1. Objetivo

Acompanhar cada peça odontológica desde a moldagem e a ordem de serviço até o laboratório, o retorno físico à clínica e a entrega ao paciente. Evitar cobranças desencontradas, atrasos, baixas sem evidência e dúvidas sobre preço e limite mensal de cada laboratório. Acompanhar cada peça individualmente, ainda que o paciente tenha várias peças ou peças de laboratórios diferentes.

## 2. Encaminhamento dos laboratórios

Mapeamento informado verbalmente; confirmar grafia dos nomes e cadastro formal antes de criar contas:

| Nome operacional | Especialidade informada | Observações |
| --- | --- | --- |
| Emerson | PPF posterior | Encaminhamento preferencial |
| Designer | PSI e PPF anterior | Confirmar nome cadastral |
| Carla / Alexandre | PT, PPR e demais peças não cobertas pelas especialidades | O laboratório é referido pelos dois nomes |
| Daiane | Contenção | Apenas contenção |
| Eder | Infraestrutura da PPR | Etapa específica, possivelmente vinculada a uma PPR que seguirá para outro laboratório |

A sugestão de laboratório é automática segundo o procedimento **e a etapa**, mas permite substituição autorizada e registra a justificativa. Não presumir que toda peça tenha exatamente um laboratório: a infraestrutura da PPR pode exigir fluxo em mais de um responsável.

## 3. Identificação por peça

Campos propostos para o cadastro:

- ID interno imutável da peça; código Casal Odonto legível e único.
- Identificador do paciente no Clinicorp, nome, unidade (Sorocaba / Salto) e agendamento vinculado.
- Procedimento/tipo de peça, quantidade e descrição do trabalho.
- Dente(s) ou região/arcada, quando aplicáveis. Não mesclar automaticamente peças diferentes de um mesmo paciente.
- Laboratório e responsável atribuído; preço unitário negociado; quantidade; valor total calculado; moeda BRL.
- Prioridade normal/urgente, justificativa e data/hora da próxima consulta do paciente.
- Prazo prometido e datas de envio, recebimento pelo laboratório, retorno à clínica e entrega ao paciente.
- Código próprio do laboratório (pode ficar vazio até o retorno); local físico/caixa na clínica.
- Status operacional, observação, anexos autorizados e histórico de eventos.

Valores são mantidos por laboratório + tipo/etapa de peça, editáveis por perfil autorizado, com valor aplicado à peça congelado no momento do registro para preservar histórico de custo. A exibição do preço na etiqueta **não foi confirmada** e deve ser configurável/omitida para documentos externos.

## 4. Ciclo de vida e permissões

Estados previstos, com datas e autores individualizados:

1. **Moldagem realizada / identificado:** registrar automaticamente a partir do Clinicorp se houver evento/dado adequado; senão, oferecer criação manual.
2. **Aguardando envio:** confirmar tipo, dente/arcada, laboratório, valor e prazo; gerar ordem de serviço.
3. **Enviado ao laboratório:** registrar quem enviou, quando, referência da OS e imprimir etiqueta com código interno.
4. **Recebido no laboratório:** o laboratório confirma chegada física e registra sua própria referência/código quando disponível.
5. **Em produção:** laboratório acompanha execução e atualiza previsão; permitir ocorrências de atraso e observações.
6. **Enviado à clínica:** laboratório informa despacho; **não** equivale a recebimento físico.
7. **Recebido na clínica:** equipe da unidade confirma fisicamente, informa data, responsável e localização da peça.
8. **Entregue ao paciente:** confirmação distinta, com data, usuário e registro de entrega; etiqueta/ficha pode ser colada no prontuário físico.
9. **Revisão/reenvio:** registrar motivo, responsável, histórico e novo envio, sem apagar movimentações anteriores.
10. **Cancelado:** apenas com permissão e motivo; preservar histórico.

Não permitir que a informação de envio/WhatsApp dê automaticamente baixa de recebimento, nem que a chegada à clínica conclua a entrega ao paciente. Baixas equivocadas exigem **estorno auditado**, não exclusão silenciosa. Laboratório só altera seus próprios pedidos e status sob sua responsabilidade, sem poder confirmar baixa física na clínica ou entrega ao paciente.

## 5. Etiqueta, ficha e impressão

Ação **Imprimir etiqueta** no fluxo de enviar ao laboratório e opção de reimpressão, com registro de quem reimprimiu. Campos mínimos da etiqueta de envio:

- Nome completo do paciente;
- Código interno Casal Odonto;
- Tipo de peça, dente(s)/região/arcada e laboratório destinatário;
- Data de envio e, se couber ao tamanho físico, prazo previsto;
- Espaço para **código do laboratório** quando for atribuído; não torná-lo obrigatório no primeiro envio.

A ficha compacta de rastreabilidade pode conter também "recebido pelo laboratório", "retornou à clínica" e "entregue ao paciente", com datas preenchidas ao longo do processo. A ficha/adesivo será fixada na documentação física do paciente após a entrega. Gerar versão PDF imprimível e estudar impressão na etiquetadora existente, após levantar largura, modelo, conexão e rolo compatível; **não presumir compatibilidade automática**.

## 6. Tela do laboratório

Portal responsivo, com login próprio, mostrando **somente** peças daquele laboratório. Lista priorizada pela data/hora da próxima consulta, contendo:

- Paciente (apenas os dados necessários), código da peça, procedimento, dente/arcada;
- Data/hora da próxima consulta, prazo de produção, status, prioridade e eventuais atrasos;
- Ação para confirmar chegada, registrar código do laboratório, marcar produção, atualizar previsão e informar despacho;
- Resposta para peças prioritárias: "consigo entregar" / "não consigo cumprir prazo", previsão e observação;
- Seu próprio acumulado e limite mensal, se a gestão autorizar a exposição contratual dessa informação.

Não mostrar outros laboratórios, dados financeiros da clínica ou dados clínicos desnecessários. Alterações e acessos administrativos exigem autenticação, controle por perfil e auditoria no banco.

## 7. Prioridades, agenda e atrasos

- Na visão operacional da clínica, exibir: **paciente, peça, procedimento, dente/arcada, laboratório, próximo agendamento, prazo e status**.
- Ordenar por consulta mais próxima e destacar vencidos ou em risco.
- A equipe pode marcar prioridade/urgência e registrar motivo (ex.: semana com vários procedimentos).
- O laboratório visualiza claramente a prioridade e informa capacidade de entrega e previsão, sem alterar unilateralmente o que foi solicitado.
- Permitir negociação de quais peças prioritárias cabem dentro do teto mensal, deixando rastreabilidade da decisão da clínica.
- Sempre que houver integração, atualizar próxima consulta a partir do Clinicorp sem duplicar a peça. Não cancelar ou reagendar consultas automaticamente sem regra validada.

## 8. Preços, teto mensal e LYRVA

- Cadastrar tabela de valores negociados por laboratório e tipo de trabalho, com histórico de alterações.
- Registrar valor de cada peça e calcular total por paciente, laboratório, unidade e mês.
- Registrar **limite de gasto mensal por laboratório**, configurável por gestão.
- Painel mensal: valor já realizado/confirmado, valores previstos/solicitados, saldo estimado até o teto e peças pendentes; distinguir competência financeira de fluxo físico.
- Alertas visuais de aproximação/ultrapassagem do teto, com parâmetros configuráveis (percentuais exatos ainda não definidos).
- Fluxo de prioridade quando orçamento estiver apertado, permitindo que laboratório e equipe negociem a lista a produzir sem apagar solicitações.
- Integração proposta com **LYRVA** para que o financeiro acompanhe custos e compromissos de laboratório. **Ainda depende de validação técnica e de regras de contabilização, pagamento e prevenção de duplicidade.**
- O laboratório pode consultar seu próprio total e limite, se autorizado; não acessa dados de outros laboratórios.

## 9. Auditoria e rastreabilidade

Cada evento relevante deve registrar: ID da peça, evento/status anterior e novo, data/hora em fuso da clínica, usuário e perfil, unidade, laboratório, observação/justificativa e, quando aplicável, documento/referência. Históricos de movimentações, modificações e documentos devem ser consultáveis na peça. Nenhum usuário pode ocultar registros anteriores alterando apenas o status atual.

## 10. Integrações e condições técnicas

**Clinicorp:** investigar endpoints e permissões para pacientes, moldagens/procedimentos, profissionais, agenda, eventos e atualização incremental. A automação deve ser idempotente e preservar correções manuais. Se a moldagem não for identificável pela API, oferecer fluxo manual de "nova peça" sem prometer automação indisponível.

**LYRVA:** definir formato seguro de compartilhamento/consulta de dados por unidade/laboratório, chaves de referência e proteção contra valores duplicados. Nunca assumir que um status de produção equivale a despesa paga.

**Impressão:** geração PDF primeiro; impressão direta na etiquetadora apenas após validação física do dispositivo.

## 11. Critérios de aceite sugeridos

- Um paciente com 3 peças mostra 3 estados/valores/históricos independentes.
- PPF posterior sugere Emerson, PSI sugere Designer, contenção sugere Daiane, infraestrutura PPR sugere Eder, com possibilidade de intervenção autorizada.
- Peça de PPF anterior seleciona Designer; campos de dentes/arcada preservam números informados.
- Envio imprime etiqueta sem exigir código de laboratório; código pode ser cadastrado ao receber.
- Laboratório não consegue ver peças de outro laboratório nem dar baixa de entrega ao paciente.
- Despacho não marca peça "recebida na clínica"; só uma pessoa autorizada da clínica confirma o recebimento físico.
- Baixa e estorno guardam usuário e motivo; existe histórico acessível.
- Teto mensal mostra valores confirmados e compromissos previstos separadamente e sinaliza risco de ultrapassagem.
- Agenda permite ordenar as entregas pela próxima consulta e acompanhar as prioridades.

## 12. Dados a validar com a equipe

1. Nomes cadastrais e logins de cada laboratório; relação exata Carla/Alexandre.
2. Tabela de preços por peça e eventuais valores diferentes por região/dente/laboratório.
3. Tetos mensais dos laboratórios e regra de contabilização (pedido, produção, entrega, faturamento ou pagamento).
4. Modelo/largura/compatibilidade da etiquetadora, tamanho da ficha, campos que devem ir na etiqueta.
5. Quem pode editar preços, autorizar exceções e confirmar entrega final ao paciente.
6. Campos e disponibilidade real da API Clinicorp para moldagem, agenda e peças.
7. Regras de faturamento e integração técnica com LYRVA.
8. Quais peças possuem SLA de 7 dias e quais exigem prazo distinto.

## 13. Não confundir protótipo com implementação

A beta descrita em `docs/beta.md` usa dados fictícios e simulação no navegador. O cadastro/edição operacional real, as etiquetas imprimíveis, precificação, sincronização Clinicorp, acesso externo de laboratório, teto mensal e integração LYRVA permanecem como trabalho a implementar e validar.
