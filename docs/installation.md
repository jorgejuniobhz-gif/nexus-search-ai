# Instalação e atualização

## Requisitos

- Windows no host de processamento, Node.js 24+ e Everything 1.4.1.
- API JSON funcional no próprio host em http://127.0.0.1:8888/?search=teste&json=1.
- Pastas aprovadas presentes no índice, com caminhos locais ou UNC conhecidos.
- Conta Windows do processo com leitura nas origens e permissão de gravação nos dados locais do Nexus.

A aplicação é executada diretamente no Windows. Não requer ambiente Linux, contêiner ou serviço de inferência. Não há pacotes npm externos para instalar.

## Obter o programa

O [código atual](https://github.com/jorgejuniobhz-gif/nexus-search-ai/tree/codex/nexus-web-1.0/web-v1) está em web-v1, na branch codex/nexus-web-1.0. Se usar Code → Download ZIP no GitHub, selecione essa branch primeiro. Extraia e copie o conteúdo de web-v1 para uma pasta exclusiva de instalação. A pasta de execução é a que contém package.json, server.mjs e scripts/.

A main contém a documentação atualizada; enquanto o PR #1 estiver aberto, ela não contém o código da aplicação. O ZIP completo de atualização fornecido separadamente tem os arquivos do aplicativo na raiz, sem a camada web-v1.

## Primeira instalação

No Prompt de Comando ou PowerShell, entre na pasta do programa e execute:

~~~cmd
npm.cmd run setup
~~~

Informe uma raiz Windows aprovada, em caminho absoluto, e o UNC correspondente se desejar mapear um caminho local para apresentação na interface. Exemplos fictícios: C:\ExampleData e \\example-server\example-share. Se o índice usa UNC diretamente, cadastre a mesma raiz UNC. O assistente cria .env e exibe uma senha aleatória uma única vez; guarde-a em local privado. Se .env já existe, o assistente não substitui a configuração e não revela a senha anterior.

Depois:

~~~cmd
npm.cmd test
npm.cmd start
~~~

Acesse http://127.0.0.1:3000 no próprio host e entre com admin e a senha gerada. Esse é o modo local inicial. O programa deve ser executado no diretório que contém .env, pois npm.cmd start usa --env-file=.env.

## Preparar a equipe

Siga o [guia de rede e HTTPS](network.md). A LAN usa modo accounts, origem HTTPS exata, certificado confiável e firewall limitado à rede aprovada. A porta 8888 continua exclusiva do loopback. Depois, cadastre as contas e concessões em [Usuários](users.md).

## Atualizar uma instalação existente

1. Encerre o processo do Nexus. Se houver tarefa agendada, interrompa-a para evitar reinício durante a cópia.
2. Faça backup privado da instalação, especialmente .env e data/.
3. Substitua os arquivos do programa pelo conteúdo atualizado de web-v1 ou do ZIP completo. Preserve .env, data/ e eventuais caminhos externos de base/certificados configurados.
4. Não execute setup nem setup:https novamente em uma atualização comum.
5. Execute npm.cmd test e inicie pelo método existente. Reative a tarefa agendada se tiver sido interrompida.
6. Atualize o navegador com Ctrl+F5 e teste uma conta administrativa e uma comum.

A versão 1.1.3 acrescenta o período e preserva usuários, senhas, concessões, download, origem HTTPS e certificados existentes. Não é necessário gerar nova autoridade para atualizar o filtro.

## Arquivos locais

| Arquivo | Uso |
| --- | --- |
| .env | Host, porta, origem HTTPS, raízes, segredo inicial e opções |
| data/users.json | Contas, concessões e hash administrativo atualizado, quando houver |
| data/tls/ | Chave do servidor, certificado e certificado público da autoridade |
| .env.before-https-* | Backup local criado pelo assistente HTTPS |

O caminho de data/users.json pode ser alterado por NEXUS_USERS_FILE. Certificados também podem apontar para caminhos externos no .env. O [exemplo de configuração](../config/.env.example) é fictício; mantenha os arquivos reais fora do GitHub.

## Reversão

Encerre o processo, restaure a versão anterior dos arquivos do programa e mantenha os dados locais protegidos. Restaure .env apenas se a alteração exigir; uma atualização de interface não exige voltar configurações de rede. Confirme compatibilidade dos dados antes de restaurar um backup antigo e iniciar o serviço.
