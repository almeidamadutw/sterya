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

Suporte, gestão e equipe consultam o catálogo da própria clínica. Laboratórios externos não têm acesso. As três tabelas têm RLS; clientes autenticados recebem apenas leitura, sem escrita direta. O catálogo ainda não oferece edição manual, controle de estoque, pedidos de compra ou aprovações.

## Estrutura e importação

- `material_categories`: grupos da clínica e ordem de exibição.
- `material_imports`: nome e SHA-256 do documento, contagens, autoria da solicitação e horário da importação.
- `materials`: cadastro, variante, origem e eventual observação de conferência.

Chaves compostas mantêm material, categoria e importação na mesma clínica. A unicidade usa clínica, grupo, nome e variante normalizados; reenviar a mesma carga não cria duplicações. O hash do documento impede uma segunda importação independente da mesma fonte. Não há endpoint de importação aberto ao cliente.

O PDF e sua carga completa não são versionados no repositório público. O banco mantém o catálogo operacional e sua origem; o Git guarda a migração do esquema, a interface e a documentação técnica.
