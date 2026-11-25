# Acesso e administração de usuários

## Primeiro acesso

1. Abra a tela de login e selecione **Ativar com código**.
2. Informe o usuário e o código recebidos do suporte.
3. Escolha uma senha de 8 a 128 caracteres com letras e números e confirme a senha.
4. Depois de ativar, entre pelo login.

O código é de uso único e expira em 24 horas. O código é vinculado ao usuário informado. A confirmação da ativação não entra automaticamente: o login valida a senha escolhida em uma nova sessão.

## Criar acesso para outra pessoa

1. Entre com perfil suporte ou gestão.
2. Abra **Usuários > Primeiro acesso**.
3. Informe nome, usuário e perfil. Para laboratório, selecione o laboratório da mesma clínica.
4. Clique em **Gerar código**, copie e entregue o usuário e o código diretamente à pessoa.
5. Ela aparecerá na lista de usuários após ativar a conta.

O mesmo usuário não pode ser usado por duas pessoas. Somente suporte pode emitir acesso de suporte. O cadastro de laboratórios ainda será implementado; por isso, a emissão de acesso externo depende de um laboratório previamente cadastrado.

## Recuperar uma senha

1. Suporte ou gestão abre **Usuários > Recuperar acesso**.
2. Seleciona a pessoa da própria clínica e gera o código.
3. A pessoa abre **Recuperar acesso** no login, informa usuário/código e escolhe a nova senha.
4. Ela entra novamente. As sessões anteriores perdem o acesso aos dados.

O código de recuperação dura 15 minutos. Um código de ativação não serve para recuperar senha. Reemitir um código revoga o anterior da mesma finalidade. Não é necessário e-mail real.

## Primeira conta de suporte

A primeira conta precisa de um código inicial emitido pelo responsável técnico, fora do fluxo público. A pedido de Matteo, o acesso inicial será **suporte@cpe.ceoclub**, perfil **suporte**, clínica **Casal Odonto**. O identificador interno é `suporte`. O código inicial anteriormente reservado para `matteo` foi revogado antes do uso. A conta Auth e o perfil são criados quando o novo código é resgatado. O código não é versionado; será entregue diretamente a Matteo. Se expirar, o responsável técnico emite um novo hash com a mesma finalidade no ambiente administrativo do banco.

O login aceita o formato `usuario@cpe.ceoclub` e também o identificador simples. O sufixo anterior `@ceoclubcpe` continua aceito para compatibilidade. Este identificador não é uma caixa postal real.

## Testar sem conta

No login, **Explorar versão beta** abre `/beta`. Esse ambiente contém somente dados fictícios, mantidos em memória no navegador. Permite navegar, simular movimentações de peças, consultar o histórico e testar pedidos/aprovações de materiais. Os perfis simulados podem ser trocados na tela. Recarregar a página ou clicar em **Reiniciar teste** restaura o cenário inicial. Não há login, consultas ao Supabase ou importação de pacientes nesse ambiente. A beta não altera as permissões dos acessos reais.

## Dificuldades de acesso

- Código inválido/expirado/usado: conferir o usuário, colar o código completo ou solicitar outro código.
- Muitas tentativas: aguardar a janela de 15 minutos.
- Conta indisponível: procurar o suporte para verificar perfil e situação.
- Usuário/senha incorretos: conferir as informações ou pedir recuperação.

Nunca compartilhe a senha. A equipe que gera o código não escolhe nem precisa conhecer a senha da pessoa.
