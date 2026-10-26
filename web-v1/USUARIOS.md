# Gestão de usuários

A administração usa contas próprias do Nexus, conforme o modelo aprovado pelo usuário. Não há integração com AD. A autorização por pessoa é feita no backend antes de consultar o Everything e novamente antes de baixar conteúdo.

## Cadastro simples

1. Entre com login **admin** e a senha administrativa já existente.
2. Abra **Usuários** e **Novo usuário**.
3. Informe nome, login de 3 a 32 caracteres e senha inicial de 12 a 128 caracteres. O login aceita letras, números, ponto, hífen e sublinhado, sem distinguir maiúsculas/minúsculas.
4. Expanda a árvore e marque as pastas permitidas. Marcar uma pasta inclui todos os seus descendentes. Não há negação por subpasta dentro de uma pasta concedida. Nenhuma seleção significa nenhum acesso.
5. Marque **Permitir download** se a pessoa puder receber o conteúdo dessas pastas. A variável global NEXUS_DOWNLOADS também deve ser true.
6. Salve e informe login/senha à pessoa por um canal privado. Não envie credenciais para GitHub ou chats.

O painel permite editar nome, login, pastas, permissão de download e estado ativo. Deixe a senha vazia na edição para mantê-la; preencha para redefinir. As senhas nunca são recuperadas nem exibidas.

Qualquer alteração encerra as sessões anteriores e interrompe downloads ativos. Desativar impede novos logins. Reativar não restaura sessões antigas. A conta administrativa principal fica no .env, não pode ser removida pelo painel e não é possível promover contas comuns a administrador. Não existe autocadastro.

## Dados locais e proteção

A base fica em data/users.json, com hashes scrypt e salt aleatório, gravada por substituição atômica. A interface recebe apenas dados de cadastro e concessões, nunca hashes. Há limite de 200 usuários e 20 pastas por conta. Concessões só podem estar dentro das raízes globais configuradas no .env.

Preserve data/ em atualizações e backups privados. Proteja a instalação, o .env, a base, certificados e backups com permissões NTFS restritas ao administrador e à conta que executa o processo. Base inválida ou sem leitura impede inicializar; restaure o backup, não apague a base para contornar o erro.

Mudanças nas raízes globais são aplicadas no próximo reinício, e concessões fora delas deixam de valer. Sessões são descartadas em cada reinício e expiram em 30 minutos.

## O que cada conta pode fazer

- Árvore, raízes, busca e totais são limitados às pastas concedidas. Contas sem pastas recebem zero resultados sem consultar o índice.
- Navegação para pastas fora do escopo é recusada no backend, mesmo com alteração manual da URL.
- Uma página com resultados fora do escopo é descartada integralmente, inclusive seu total.
- Download exige autorização global e individual, ID da própria sessão, pasta permitida e leitura pela conta Windows do processo. A autorização é revalidada após abrir o arquivo e em todo download.
- IDs de outra conta/sessão não funcionam. Apenas arquivos regulares; links simbólicos/junctions verificados são recusados.
- Alterações durante uma busca impedem devolver a resposta antiga. Revogar uma conta também interrompe downloads em andamento.

## Limites do modelo aprovado

As concessões do painel autorizam pesquisa e, quando marcada, leitura do conteúdo. Não representam identidade Windows e não reproduzem ACLs NTFS/SMB individuais. O backend lê com a conta Windows que executa o Nexus depois de conferir a concessão da conta Nexus. Conceda somente conteúdo que a pessoa pode receber.

O painel não altera permissões dos compartilhamentos Windows: acesso direto pelo Explorador continua seguindo a configuração atual do servidor. As raízes e seus ancestrais precisam ser administrados por pessoas confiáveis. Não há isolamento contra administrador local malicioso ou substituições concorrentes de diretórios por quem controla o filesystem. Verificar links pelo cliente SMB não substitui o controle do servidor de arquivos.

A versão usa cookies HttpOnly/SameSite=Strict e Secure no HTTPS, validação de Host e origem, bloqueio de cabeçalhos de proxy, limites de login por IP/conta, 3 buscas simultâneas, timeout upstream de 8 segundos e resposta de até 2 MB. Não registra pesquisas/caminhos nem envia conteúdo a IA.
