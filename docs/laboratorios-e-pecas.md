# Controle Protético e Laboratórios — requisitos operacionais

**Projeto** STERYA / CEO Club CPE

**Origem** Validação operacional da Casal Odonto em 19/11/2026, atualização de nomes em 25/11/2026 e tabelas de preços enviadas em 27/11/2026.

**Estado deste documento** Requisitos operacionais, catálogo de serviços e propostas de implementação.

## 1. Objetivo

Acompanhar cada peça odontológica desde a moldagem e a ordem de serviço até o laboratório, o retorno físico à clínica e a entrega ao paciente. Evitar cobranças desencontradas, atrasos, baixas sem evidência e dúvidas sobre preço e limite mensal de cada laboratório. Acompanhar cada peça individualmente, ainda que o paciente tenha várias peças ou peças de laboratórios diferentes.

## 2. Encaminhamento dos laboratórios

O catálogo de 27/11/2026 usa os nomes dos cadastros já existentes no CPE.

| Nome cadastral informado | Especialidade informada | Observações |
| --- | --- | --- |
| Laboratório Alexandra - Carla | Prótese total, PPR e protocolos | Recebe a tabela identificada como “Alexandre” |
| Laboratório Emerson | PPF posterior | Encaminhamento preferencial |
| Laboratório Design - Renan | PSI e PPF anterior | Usar "Design - Renan", não "Designer" |
| Laboratório Daiane Mota | Ortodontia e contenção | Tabela identificada como “Daiane Orto” |
| Laboratório Eder | Infraestrutura da PPR | Etapa específica, possivelmente vinculada a uma PPR que seguirá para outro laboratório |

Em **Peças → Cadastrar nova peça**, o laboratório é preenchido segundo o procedimento e, quando necessário, a região ou a etapa. Uma troca da sugestão exige justificativa e fica registrada no histórico da peça. Não presumir que toda peça tenha exatamente um laboratório: a infraestrutura da PPR pode exigir fluxo em mais de um responsável.

## 3. Identificação por peça

Campos propostos para o cadastro:

- ID interno imutável da peça; código Casal Odonto legível e único.
- Identificador do paciente no Clinicorp, nome, unidade (Sorocaba / Salto) e agendamento vinculado.
- Procedimento/tipo de peça, quantidade e descrição do trabalho.
- Dente(s) ou região/arcada, quando aplicáveis. Não mesclar automaticamente peças diferentes de um mesmo paciente.
- Laboratório e responsável atribuído, com quantidade da peça. Os valores de referência ficam no catálogo de serviços do laboratório.
- Prioridade normal/urgente, justificativa e data/hora da próxima consulta do paciente.
- Prazo prometido e datas de envio, recebimento pelo laboratório, retorno à clínica e entrega ao paciente.
- Código próprio do laboratório (pode ficar vazio até o retorno); local físico/caixa na clínica.
- Status operacional, observação, anexos autorizados e histórico de eventos.

## 4. Ciclo de vida e permissões

Estados previstos, com datas e autores individualizados:

1. **Moldagem realizada / identificado:** registrar automaticamente a partir do Clinicorp se houver evento/dado adequado; senão, oferecer criação manual.
2. **Aguardando envio:** confirmar tipo, dente/arcada, laboratório e prazo e gerar a ordem de serviço. O catálogo é consultado separadamente na área de Laboratórios.
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
- Valores por peça, acumulados e tetos mensais dependem de regras futuras de precificação e acesso.

Não mostrar outros laboratórios, dados financeiros da clínica ou dados clínicos desnecessários. Alterações e acessos administrativos exigem autenticação, controle por perfil e auditoria no banco.

## 7. Prioridades, agenda e atrasos

- Na visão operacional da clínica, exibir: **paciente, peça, procedimento, dente/arcada, laboratório, próximo agendamento, prazo e status**.
- Ordenar por consulta mais próxima e destacar vencidos ou em risco.
- A equipe pode marcar prioridade/urgência e registrar motivo (ex.: semana com vários procedimentos).
- O laboratório visualiza claramente a prioridade e informa capacidade de entrega e previsão, sem alterar unilateralmente o que foi solicitado.
- Futuramente, quando houver regras de preço/teto validadas, permitir negociação de quais peças prioritárias cabem no orçamento, com rastreabilidade. **Não implementar cálculo de teto agora**.
- Sempre que houver integração, atualizar próxima consulta a partir do Clinicorp sem duplicar a peça. Não cancelar ou reagendar consultas automaticamente sem regra validada.

## 8. Catálogo de serviços e precificação por peça

Em 25/11/2026, a equipe informou que o preço era normalmente definido manualmente por etapa da peça e adiou a implementação para verificar se a Ellis tinha uma tabela fixa. Em 27/11/2026, as tabelas enviadas pela clínica passaram a ser a fonte do catálogo de preços fixos dos cinco laboratórios.

Na tela **Laboratórios**, os perfis internos da clínica consultam a especialidade e a lista de serviços de cada parceiro. A lista mostra o preço fixo em reais, os códigos presentes na fonte e as observações dos itens marcados na tabela. Cada laboratório segue acessando suas peças pelo próprio perfil.

Vincular um preço a uma etapa ou peça exige definir quando usar o valor do catálogo e quando registrar um valor manual. Cobrança, tetos mensais, alertas de orçamento e integração com o **LYRVA** dependem dessa regra e da forma de contabilização.

## 9. Auditoria e rastreabilidade

Cada evento relevante deve registrar: ID da peça, evento/status anterior e novo, data/hora em fuso da clínica, usuário e perfil, unidade, laboratório, observação/justificativa e, quando aplicável, documento/referência. Históricos de movimentações, modificações e documentos devem ser consultáveis na peça. Nenhum usuário pode ocultar registros anteriores alterando apenas o status atual.

## 10. Integrações e condições técnicas

**Clinicorp:** investigar endpoints e permissões para pacientes, moldagens/procedimentos, profissionais, agenda, eventos e atualização incremental. A automação deve ser idempotente e preservar correções manuais. Se a moldagem não for identificável pela API, oferecer fluxo manual de "nova peça" sem prometer automação indisponível.

**LYRVA:** definir formato seguro de compartilhamento/consulta de dados por unidade/laboratório, chaves de referência e proteção contra valores duplicados. Nunca assumir que um status de produção equivale a despesa paga.

**Impressão:** geração PDF primeiro; impressão direta na etiquetadora apenas após validação física do dispositivo.

## 11. Critérios de aceite sugeridos

- Um paciente com 3 peças mostra 3 estados e históricos independentes.
- PPF posterior sugere Laboratório Emerson, PSI sugere Laboratório Design - Renan, contenção sugere Laboratório Daiane Mota, infraestrutura PPR sugere Laboratório Eder, com possibilidade de intervenção autorizada.
- Peça de PPF anterior sugere Laboratório Design - Renan; campos de dentes/arcada preservam números informados.
- Envio imprime etiqueta sem exigir código de laboratório; código pode ser cadastrado ao receber.
- Laboratório não consegue ver peças de outro laboratório nem dar baixa de entrega ao paciente.
- Despacho não marca peça "recebida na clínica"; só uma pessoa autorizada da clínica confirma o recebimento físico.
- Baixa e estorno guardam usuário e motivo; existe histórico acessível.
- A equipe consulta preços fixos por laboratório e consegue concluir as etapas físicas da peça de forma independente do catálogo.
- Agenda permite ordenar as entregas pela próxima consulta e acompanhar as prioridades.

## 12. Dados a validar com a equipe

1. Identificadores e logins dos cinco laboratórios nomeados acima; validar especialidades definitivas, se necessário.
2. Definir como vincular serviços do catálogo às etapas das peças e quando permitir valores manuais.
3. Definir futuramente os tetos mensais dos laboratórios e a regra de contabilização, depois da confirmação da precificação.
4. Modelo/largura/compatibilidade da etiquetadora, tamanho da ficha, campos que devem ir na etiqueta.
5. Quem pode editar preços, autorizar exceções e confirmar entrega final ao paciente.
6. Campos e disponibilidade real da API Clinicorp para moldagem, agenda e peças.
7. Regras de faturamento e integração técnica com LYRVA.
8. Quais peças possuem SLA de 7 dias e quais exigem prazo distinto.

## 13. Não confundir protótipo com implementação

A beta descrita em `docs/beta.md` ainda usa dados fictícios e simulação no navegador. Já foram implantados em 25/11/2026 o **cadastro manual real de peças**, as **movimentações persistentes com auditoria e estorno**, a **visão de peças por laboratório com RLS**, a **etiqueta 50 × 30 mm imprimível via navegador** (três datas) e o **catálogo real de materiais por especialidade**. A atualização de 27/11/2026 acrescenta o catálogo de preços fixos para consulta interna. O login operacional de cada laboratório ainda exige a emissão de seus códigos pela gestão, e a impressão física depende de teste com a Ablemark. Seguem pendentes a edição completa de peças, a criação automática de peças via Clinicorp, a definição de valor por peça ou etapa, os tetos mensais, a integração com o LYRVA e os testes da interface publicada.
