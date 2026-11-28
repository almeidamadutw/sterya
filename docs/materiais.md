# Catálogo de materiais

Implantado em 25/11/2026 em `/painel/materiais`, no Supabase da clínica. O cadastro foi solicitado a partir do PDF de materiais por especialidade fornecido pela equipe.

## Conteúdo importado

Foram preservadas as 127 descrições originais. A separação de tamanhos e versões explícitos resultou em 139 cadastros:

| Especialidade / grupo | Cadastros |
| --- | ---: |
| Dentística | 23 |
| Endodontia | 16 |
| Ortodontia | 6 |
| Todas as especialidades | 33 |
| Farmácia/Internet | 10 |
| Periodontia | 4 |
| Cirurgia | 15 |
| Prótese | 32 |
| **Total** | **139** |

Cada material tem código interno, nome, tamanho/versão quando informado e grupo. A redação original permanece em `source_label`, além da referência à importação. Correções de acentuação não substituem esse registro de origem. Não foram inferidas marcas, dosagens, quantidades, saldos, preços ou unidades de compra.

As versões claras, como tamanhos de luvas, fio retrator com zeros à esquerda e larguras do grau para esterilização, foram separadas. Uma medida de placa de silicone está ambígua no PDF e recebeu `review_note`; aparece sinalizada na interface para conferência, sem correção presumida.

## Uso e permissões

A pesquisa aceita nome, tamanho, versão ou código, sem diferenciar acentos ou maiúsculas. O filtro por grupo pode ser combinado com a busca. A listagem mostra até 40 itens por página.

Suporte, gestão e equipe consultam o catálogo da própria clínica. Laboratórios externos não têm acesso. As três tabelas têm RLS; clientes autenticados recebem apenas leitura, sem escrita direta. A equipe pode cadastrar e editar materiais e registrar entradas e baixas pela interface. As escritas passam por rotinas transacionais que validam o perfil e a clínica.

## Estrutura e importação

- `material_categories`: grupos da clínica e ordem de exibição.
- `material_imports`: nome e SHA-256 do documento, contagens, autoria da solicitação e horário da importação.
- `materials`: cadastro, variante, origem e eventual observação de conferência.

Chaves compostas mantêm material, categoria e importação na mesma clínica. A unicidade usa clínica, grupo, nome e variante normalizados; reenviar a mesma carga não cria duplicações. O hash do documento impede uma segunda importação independente da mesma fonte. Não há endpoint de importação aberto ao cliente.

O PDF e sua carga completa não são versionados no repositório público. O banco mantém o catálogo operacional e sua origem; o Git guarda a migração do esquema, a interface e a documentação técnica.

## Estoque e compras

1. Em Materiais, cadastre a unidade de medida de cada item (por exemplo, caixa). A unidade de medida é fixa após o uso em estoque ou em um pedido.
2. Em Estoque e edição, selecione a unidade da clínica e lance o saldo inicial, entrada avulsa ou baixa. Cada lançamento guarda motivo, responsável, horário e saldo. O estoque não aceita baixa acima do saldo.
3. Em Pedidos de compra, selecione uma unidade, inclua os itens com quantidade e escolha a prioridade (Normal, Alta ou Urgente). Os pedidos pendentes aparecem primeiro, com os urgentes acima dos demais. O perfil Gestão aprova ou recusa o pedido. A equipe registra o código da compra e confirma as quantidades entregues.
4. Cada recebimento soma ao estoque da unidade indicada no pedido. Entregas parciais deixam o pedido aberto até completar todos os itens. O histórico registra os responsáveis e as observações por etapa.

O catálogo importado não tinha saldos ou unidades de medida. Eles são informados pela equipe a partir da contagem real. Para a Ana aprovar, o acesso dela deve estar ativo com perfil Gestão.

O botão **Cadastrar item** na aba de compras abre o mesmo cadastro disponível durante a montagem de um pedido. Use os grupos **Essenciais** e **Outras compras** para itens como papel higiênico. O item salvo fica no catálogo e pode ser usado na lista atual sem perder as informações já preenchidas.

## Painel de compras e compra assistida

Abra **Compras e estoque** no menu. Os atalhos levam ao catálogo com saldos, à lista de pedidos e aos pedidos que aguardam recebimento. A fila mostra a próxima ação de cada pedido. O filtro de unidade acompanha a paginação e é levado aos atalhos e ao formulário de novo pedido.

Quando a gestão aprovar um pedido, abra **Comprar pelo iFood** no detalhe dele e selecione **Copiar lista aprovada**. A lista inclui nome, variante, quantidade e unidade de medida do pedido. Se a cópia automática estiver bloqueada pelo navegador, a tela exibe o texto para cópia manual.

Cole o link de compartilhamento do mercado para abri-lo em outra aba ou use **Buscar mercado no iFood**. Confira o endereço da unidade, os produtos, os preços e o frete no iFood e finalize a compra por lá. Volte ao STERYA para registrar o código e, quando a entrega chegar, confirme as quantidades recebidas.

## Relatórios de estoque e pedidos

Na lista de **Materiais**, aplique a pesquisa, o grupo e a unidade desejados. **Baixar PDF do estoque** inclui todas as páginas do catálogo filtrado, com código, material, versão, grupo e saldo das unidades exibidas. Um saldo ainda não lançado aparece por extenso. Zero representa um saldo registrado.

Em **Compras e estoque**, selecione a unidade, a situação e a prioridade, clique em **Filtrar** e depois em **Baixar PDF dos pedidos**. No atalho **Recebimentos**, o PDF usa a mesma seleção de pedidos que aguardam entrega. Cada pedido traz os seus itens, as quantidades pedidas, recebidas e pendentes, o solicitante, a próxima ação e a data. Suporte, gestão e equipe têm acesso aos dois relatórios.
