# Controle Protético e Laboratórios — requisitos operacionais

**Projeto:** STERYA / CEO Club CPE  
**Origem:** validação operacional com a equipe da Casal Odonto em 19/11/2026; nomes e decisão sobre precificação atualizados em 25/11/2026.  
**Estado deste documento:** requisitos coletados e propostas de implementação; não implica funcionalidades já publicadas.

## 1. Objetivo

Acompanhar cada peça odontológica desde a moldagem e a ordem de serviço até o laboratório, o retorno físico à clínica e a entrega ao paciente. Evitar cobranças desencontradas, atrasos, baixas sem evidência e dúvidas sobre preço e limite mensal de cada laboratório. Acompanhar cada peça individualmente, ainda que o paciente tenha várias peças ou peças de laboratórios diferentes.

## 2. Encaminhamento dos laboratórios

Nomes operacionais fornecidos em 25/11/2026. As especialidades abaixo foram informadas na conversa anterior; conferir o enquadramento final durante o cadastro:

| Nome cadastral informado | Especialidade informada | Observações |
| --- | --- | --- |
| Laboratório Alexandra - Carla | PT, PPR e demais peças não cobertas pelas especialidades | Manter a grafia fornecida, sem substituir por "Alexandre" |
| Laboratório Emerson | PPF posterior | Encaminhamento preferencial |
| Laboratório Design - Renan | PSI e PPF anterior | Usar "Design - Renan", não "Designer" |
| Laboratório Daiane Mota | Contenção | Apenas contenção |
| Laboratório Eder | Infraestrutura da PPR | Etapa específica, possivelmente vinculada a uma PPR que seguirá para outro laboratório |

A sugestão de laboratório é automática segundo o procedimento **e a etapa**, mas permite substituição autorizada e registra a justificativa. Não presumir que toda peça tenha exatamente um laboratório: a infraestrutura da PPR pode exigir fluxo em mais de um responsável.

## 3. Identificação por peça

Campos propostos para o cadastro:

- ID interno imutável da peça; código Casal Odonto legível e único.
- Identificador do paciente no Clinicorp, nome, unidade (Sorocaba / Salto) e agendamento vinculado.
- Procedimento/tipo de peça, quantidade e descrição do trabalho.
- Dente(s) ou região/arcada, quando aplicáveis. Não mesclar automaticamente peças diferentes de um mesmo paciente.
- Laboratório e responsável atribuído; quantidade da peça. **Não exigir preço nesta etapa** (precificação adiada).
- Prioridade normal/urgente, justificativa e data/hora da próxima consulta do paciente.
- Prazo prometido e datas de envio, recebimento pelo laboratório, retorno à clínica e entrega ao paciente.
- Código próprio do laboratório (pode ficar vazio até o retorno); local físico/caixa na clínica.
- Status operacional, observação, anexos autorizados e histórico de eventos.

**Decisão de 25/11/2026 sobre precificação:** normalmente o valor é **manual, por etapa-peça**. **Não implementar a precificação agora, nem mesmo o preenchimento manual**, porque a Ellis talvez possua uma planilha com preços fixos por etapa. Antes de modelar tabela, valores, campos ou cálculo financeiro, verificar essa planilha e definir as regras com a equipe. Não incluir valores na etiqueta nesta fase.

## 4. Ciclo de vida e permissões

Estados previstos, com datas e autores individualizados:

1. **Moldagem realizada / identificado:** registrar automaticamente a partir do Clinicorp se houver evento/dado adequado; senão, oferecer criação manual.
2. **Aguardando envio:** confirmar tipo, dente/arcada, laboratório e prazo; gerar ordem de serviço. Valor fica fora desta etapa até definição da precificação.
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
- Visualização de valores/acumulado/teto mensal **não será implementada nesta etapa**; depende da decisão futura sobre precificação e acesso.

Não mostrar outros laboratórios, dados financeiros da clínica ou dados clínicos desnecessários. Alterações e acessos administrativos exigem autenticação, controle por perfil e auditoria no banco.

## 7. Prioridades, agenda e atrasos

- Na visão operacional da clínica, exibir: **paciente, peça, procedimento, dente/arcada, laboratório, próximo agendamento, prazo e status**.
- Ordenar por consulta mais próxima e destacar vencidos ou em risco.
- A equipe pode marcar prioridade/urgência e registrar motivo (ex.: semana com vários procedimentos).
- O laboratório visualiza claramente a prioridade e informa capacidade de entrega e previsão, sem alterar unilateralmente o que foi solicitado.
- Futuramente, quando houver regras de preço/teto validadas, permitir negociação de quais peças prioritárias cabem no orçamento, com rastreabilidade. **Não implementar cálculo de teto agora**.
- Sempre que houver integração, atualizar próxima consulta a partir do Clinicorp sem duplicar a peça. Não cancelar ou reagendar consultas automaticamente sem regra validada.

## 8. Precificação suspensa; tetos e integração financeira condicionados

**Decisão em 25/11/2026: NÃO IMPLEMENTAR PRECIFICAÇÃO NESTE MOMENTO.**

- A equipe informou que o preço normalmente é definido **manualmente por etapa-peça**, e não necessariamente por peça/procedimento completo.
- Antes de desenvolver, confirmar com a **Ellis** se existe uma **planilha com preços fixos por etapa**.
- Não criar ainda tabela de preços, campo de valor no formulário operacional, cálculo automático nem rotina de cobrança/custo em produção.
- Só após essa validação definir se a fonte de valores será planilha fixa importável, tabela parametrizada, lançamento manual por etapa ou combinação dessas possibilidades.
- Os tetos mensais por laboratório, alertas de orçamento e integração com **LYRVA** permanecem como **propostas futuras condicionadas** à regra de precificação validada. Não calcular gastos com valores presumidos.
- O controle operacional de peças, prioridades por consulta e movimentações físicas segue independente dessa decisão.

## 9. Auditoria e rastreabilidade

Cada evento relevante deve registrar: ID da peça, evento/status anterior e novo, data/hora em fuso da clínica, usuário e perfil, unidade, laboratório, observação/justificativa e, quando aplicável, documento/referência. Históricos de movimentações, modificações e documentos devem ser consultáveis na peça. Nenhum usuário pode ocultar registros anteriores alterando apenas o status atual.

## 10. Integrações e condições técnicas

**Clinicorp:** investigar endpoints e permissões para pacientes, moldagens/procedimentos, profissionais, agenda, eventos e atualização incremental. A automação deve ser idempotente e preservar correções manuais. Se a moldagem não for identificável pela API, oferecer fluxo manual de "nova peça" sem prometer automação indisponível.

**LYRVA:** definir formato seguro de compartilhamento/consulta de dados por unidade/laboratório, chaves de referência e proteção contra valores duplicados. Nunca assumir que um status de produção equivale a despesa paga.

**Impressão:** geração PDF primeiro; impressão direta na etiquetadora apenas após validação física do dispositivo.

## 11. Critérios de aceite sugeridos

- Um paciente com 3 peças mostra 3 estados/valores/históricos independentes.
- PPF posterior sugere Laboratório Emerson, PSI sugere Laboratório Design - Renan, contenção sugere Laboratório Daiane Mota, infraestrutura PPR sugere Laboratório Eder, com possibilidade de intervenção autorizada.
- Peça de PPF anterior sugere Laboratório Design - Renan; campos de dentes/arcada preservam números informados.
- Envio imprime etiqueta sem exigir código de laboratório; código pode ser cadastrado ao receber.
- Laboratório não consegue ver peças de outro laboratório nem dar baixa de entrega ao paciente.
- Despacho não marca peça "recebida na clínica"; só uma pessoa autorizada da clínica confirma o recebimento físico.
- Baixa e estorno guardam usuário e motivo; existe histórico acessível.
- A equipe consegue concluir as etapas físicas da peça sem informar preço; precificação, teto mensal e cálculos financeiros estão explicitamente adiados.
- Agenda permite ordenar as entregas pela próxima consulta e acompanhar as prioridades.

## 12. Dados a validar com a equipe

1. Identificadores e logins dos cinco laboratórios nomeados acima; validar especialidades definitivas, se necessário.
2. Consultar a Ellis sobre a possível planilha de preços fixos por etapa; só então definir precificação manual por etapa-peça ou outra estrutura.
3. Definir futuramente os tetos mensais dos laboratórios e a regra de contabilização, depois da confirmação da precificação.
4. Modelo/largura/compatibilidade da etiquetadora, tamanho da ficha, campos que devem ir na etiqueta.
5. Quem pode editar preços, autorizar exceções e confirmar entrega final ao paciente.
6. Campos e disponibilidade real da API Clinicorp para moldagem, agenda e peças.
7. Regras de faturamento e integração técnica com LYRVA.
8. Quais peças possuem SLA de 7 dias e quais exigem prazo distinto.

## 13. Não confundir protótipo com implementação

A beta descrita em `docs/beta.md` usa dados fictícios e simulação no navegador. O cadastro/edição operacional real, as etiquetas imprimíveis, precificação, sincronização Clinicorp, acesso externo de laboratório, teto mensal e integração LYRVA permanecem como trabalho a implementar e validar.
