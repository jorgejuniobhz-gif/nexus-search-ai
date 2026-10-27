# Diagnóstico do Nexus Web

## npm não encontra package.json

O terminal está na pasta errada ou o pacote não foi extraído. Entre na pasta que contém package.json e server.mjs. Ao baixar o repositório completo, o aplicativo está em web-v1 na branch do código; a raiz da main é documentação. Não rode setup na pasta pessoal do Windows.

## PowerShell bloqueia npm.ps1

Use npm.cmd em vez de npm, por exemplo npm.cmd start. Isso chama o executável de comando já instalado com Node e não exige mudar a política de execução do PowerShell.

## Setup informa que .env já existe e não mostra senha

Esse comportamento preserva a instalação. A senha é exibida uma única vez na criação. O usuário principal é admin; atualizações e certificados mantêm a senha. Não apague .env ou data/ para contornar a autenticação.

## Nome não encontrado

Confira a reserva DHCP, o registro DNS, os servidores consultados pelo cliente e o sufixo de pesquisa. Teste o nome completo no DNS da LAN e depois o nome curto. Um hosts local pode ocultar um problema do DNS central. O cadastro DNS precisa apontar para o host da aplicação.

## Conexão recusada ou timeout

Confira se o processo está iniciado, se há conflito de porta e se o host/porta configurados são os esperados. Para LAN, o modo accounts exige HTTPS e bind aprovado. Verifique firewall, sub-redes e rede ativa. Teste o HTTPS no host usando a origem configurada, depois em outro PC. A porta local do Everything não é a porta de acesso da equipe.

## ERR_CERT_AUTHORITY_INVALID

Confira se o nexus-ca.cer instalado veio do mesmo host e geração de certificado que serve o Nexus. Instale a autoridade no perfil Windows que abre o navegador e feche/reabra o navegador. Não gere uma autoridade diferente em cada PC. Instalar no pfSense ou cadastrar DNS não instala confiança no Edge dos clientes. Veja [HTTPS](network.md).

Para erro de nome, use a origem exata presente no certificado e no .env. Para expiração, confira datas do certificado e relógio do sistema. Não desative verificação TLS nem contorne o aviso de segurança.

## Host ou origem não permitido

Use NEXUS_PUBLIC_ORIGIN exatamente, incluindo nome e porta. Não acesse por IP quando configurado para um nome. O backend não aceita cabeçalhos de proxy/identidade encaminhada. Esta implantação usa conexão direta HTTPS ao Node.

## Everything indisponível

No host de processamento, confira se http://127.0.0.1:8888/?search=teste&json=1 devolve JSON, sem redirecionamento. Confirme a instância correta do Everything e seu HTTP server. O backend não envia Basic Auth upstream. Não publique a API na rede para corrigir erro local. Timeout, resposta maior que o limite ou JSON inválido também produzem erro.

## Nenhum resultado ou pasta ausente

Confira se a raiz está indexada usando o mesmo caminho local ou UNC cadastrado, se a conta tem concessão e se o índice está atualizado. Limpe texto, categoria, extensão e datas. A árvore carrega um nível por vez, com botão de carregar mais quando necessário. Uma pasta pode existir no disco e ainda não estar no índice.

O período é pela última modificação, não pela criação nem por data no conteúdo/nome. Arquivos sem data conhecida podem não aparecer com o período ativo. Compare com alguns arquivos de datas conhecidas no próprio Everything, incluindo o primeiro e o último dia.

## Download ausente ou negado

Confira NEXUS_DOWNLOADS=true e a opção individual da conta. O ID precisa vir de um resultado da própria sessão. O arquivo precisa continuar nas pastas permitidas e ser legível pela conta Windows do processo. Arquivo movido, removido, bloqueado ou não regular pode ser recusado. Acesso pelo Explorador de outra conta Windows não comprova acesso para o processo.

## Abrir no Windows só copia o caminho

Esse é o fluxo implementado. Cole na barra do Explorador. O navegador pode bloquear links locais; o backend não executa arquivos no servidor. A abertura obedece ao acesso Windows da pessoa.

## Sessão encerrada

Sessões expiram após 30 minutos. Reinício, troca de senha ou edição da conta invalidam sessões. Entre novamente; se a conta foi desativada, o administrador precisa revisar seu estado.

## Base inválida ou erro de leitura

Confira permissões da conta do processo e restaure um backup consistente de data/users.json quando necessário. A aplicação falha ao carregar base inválida; não a apague para recriar contas ou contornar permissões.

## Teste de junction ignorado

Um ambiente sem permissão para criar a fixture pode ignorar esse subteste. Isso não demonstra o comportamento no host real. Repita a verificação de links/junctions em ambiente autorizado e mantenha controle sobre as raízes e seus ancestrais.
