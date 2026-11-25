# Validação da primeira entrega

Data: 19/11/2026.

## Verificações automatizadas

- Tipagem TypeScript, lint e build de produção.
- Normalização de usuário: sufixo permitido, rejeição de domínios não previstos e entradas inválidas.
- Código: preservação do comprimento/alfabeto e aceitação de colagem com separadores.
- Senha: tamanho mínimo/máximo e composição exigida.
- Beta: entrega independente de uma peça do mesmo paciente, necessidade de recebimento antes da entrega, justificativa para revisão e visão limitada ao laboratório de demonstração.
- Formato de usuário: `suporte@cpe.ceoclub`, identificador simples e compatibilidade com o sufixo anterior.

## Integração no Supabase

Dados sintéticos de duas clínicas, equipe e laboratório foram usados para testar:

- Bloqueio de acesso anônimo a dados e rotinas privilegiadas.
- Ativação e login reais; resgate concorrente de código permite somente um sucesso.
- Separação entre clínicas e entre laboratório e peças não atribuídas.
- Bloqueio de promoção do próprio perfil pela API.
- Bloqueio de geração de códigos por equipe e recuperação de conta de outra clínica.
- Rejeição de código expirado, reutilizado e de finalidade incorreta.
- Recuperação de senha por código e bloqueio das sessões anteriores.
- Ativação real com o novo sufixo `@cpe.ceoclub`, seguida de login e leitura do perfil protegido, usando conta sintética removida após a validação.

## Navegador — pendente após publicação

Ainda precisam ser executados na interface publicada: login, erro de credenciais, persistência após recarregar, sair, redirecionamento de páginas privadas, bloqueio direto da área de usuários para equipe, navegação de ativação/recuperação e ausência de transbordamento horizontal em celular. O navegador local não pôde iniciar por restrição de sockets do ambiente e a publicação Vercel foi bloqueada por permissão. Build e testes reais do backend passaram; esses resultados não substituem a inspeção da interface.

## Configuração do Supabase

Foram corrigidas as permissões de execução da função interna de ativação automática de RLS. Os avisos informativos de RLS sem políticas nas três tabelas privadas são intencionais: elas não têm acesso para os clientes. O painel ainda informa que a proteção contra senhas vazadas está desativada; habilitá-la em Auth é uma recomendação antes do uso operacional: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Os dados sintéticos e contas de teste são removidos antes da entrega. As telas operacionais ainda em preparação não são consideradas funcionalidades concluídas.

## Catálogo de materiais — 25/11/2026

- Importação conferida com o PDF: 127 descrições de origem, 139 materiais e oito grupos, com uma medida sinalizada para revisão.
- Reexecução da mesma carga manteve os mesmos IDs e uma única importação, sem duplicações. Nenhuma unidade de compra, quantidade ou preço foi presumido.
- RLS ativa nas três tabelas; leitura anônima e inserção direta pelo perfil autenticado bloqueadas nas permissões. Leitura limitada a suporte, gestor e equipe da mesma clínica pelas políticas.
- Typecheck, lint, nove testes e build de produção concluídos. Os novos testes cobrem normalização de busca, zeros à esquerda em versões, caracteres literais de pesquisa e paginação inválida.
- O catálogo usa dados reais em `/painel/materiais`; a beta permanece uma simulação. Esta validação não inclui inspeção visual autenticada no navegador publicado.
