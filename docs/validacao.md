# Validação da primeira entrega

Data: 19/11/2026.

## Verificações automatizadas

- Tipagem TypeScript, lint e build de produção.
- Normalização de usuário: sufixo permitido, rejeição de domínios não previstos e entradas inválidas.
- Código: preservação do comprimento/alfabeto e aceitação de colagem com separadores.
- Senha: tamanho mínimo/máximo e composição exigida.

## Integração no Supabase

Dados sintéticos de duas clínicas, equipe e laboratório foram usados para testar:

- Bloqueio de acesso anônimo a dados e rotinas privilegiadas.
- Ativação e login reais; resgate concorrente de código permite somente um sucesso.
- Separação entre clínicas e entre laboratório e peças não atribuídas.
- Bloqueio de promoção do próprio perfil pela API.
- Bloqueio de geração de códigos por equipe e recuperação de conta de outra clínica.
- Rejeição de código expirado, reutilizado e de finalidade incorreta.
- Recuperação de senha por código e bloqueio das sessões anteriores.

## Navegador

Login, erro de credenciais, persistência após recarregar, sair, redirecionamento de páginas privadas, bloqueio direto da área de usuários para equipe, navegação de ativação/recuperação e ausência de transbordamento horizontal em celular.

Os dados sintéticos e contas de teste são removidos antes da entrega. As telas operacionais ainda em preparação não são consideradas funcionalidades concluídas.
