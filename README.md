# Nexus Search AI Web

Interface web para a equipe localizar arquivos e pastas do servidor por **nome e caminho**, usando o índice do Everything 1.4.1. A versão documentada é a **1.1.3**, com contas individuais, permissões de pastas, árvore de navegação, download controlado e filtro por período de modificação.

## Arquitetura em uso

~~~text
Navegador da equipe
        | HTTPS + login Nexus
        v
Backend Nexus (Node.js no Windows)
        |-- sessão, permissões e validação dos filtros
        |-- HTTP JSON em 127.0.0.1:8888 --> Everything 1.4.1
        |                                  índice de nomes/caminhos/datas
        |-- resultados e totais das pastas autorizadas --> navegador
        '-- download autorizado --> leitura do arquivo no disco/SMB
~~~

O Everything e o backend executam no mesmo host Windows de processamento. O servidor de arquivos fornece o compartilhamento. A equipe acessa somente o Nexus; a porta 8888 permanece no loopback. A pesquisa usa metadados: não lê o conteúdo dos documentos para produzir respostas.

## Código e documentação

A documentação principal está na branch main. O código executável está na pasta **web-v1** da branch **codex/nexus-web-1.0**, com integração acompanhada pelo [PR #1](https://github.com/jorgejuniobhz-gif/nexus-search-ai/pull/1). Até essa integração, baixar apenas a main não fornece a aplicação.

- [Código da aplicação 1.1.3](https://github.com/jorgejuniobhz-gif/nexus-search-ai/tree/codex/nexus-web-1.0/web-v1)
- [Arquitetura e fluxo de autorização](docs/architecture.md)
- [Instalação e atualização](docs/installation.md)
- [Configuração por ambiente](docs/configuration.md)
- [DNS, DHCP, pfSense e HTTPS](docs/network.md)
- [Contas, pastas e senhas](docs/users.md)
- [Inicialização automática, backup e manutenção](docs/operations.md)
- [Diagnóstico de problemas](docs/troubleshooting.md)
- [Segurança e privacidade](docs/security.md)
- [Testes e resultados](docs/pilot-results.md)
- [Evolução do produto](docs/roadmap.md)

## Recursos disponíveis

- Pesquisa literal com debounce, carregamento, erros e resultados vazios.
- Árvore por nível e navegação por pastas, com migalhas derivadas do caminho.
- Filtros por categoria/extensão, arquivo/pasta e período de última modificação.
- Datas de início e fim opcionais; o dia final é incluído inteiro.
- Totais autorizados e paginação de 25, 50 ou 100 resultados.
- Cópia de caminho UNC e orientação para abrir o original pelo Explorador do Windows.
- Login, painel administrativo, concessões por pasta, ativação/desativação e senhas.
- Download opcional, condicionado às permissões e à leitura do arquivo no backend.
- HTTPS na LAN com certificado confiável e origem configurada.

## Uso e requisitos

Windows, Node.js 24+ e Everything 1.4.1 com API JSON local funcional. Não há dependências npm externas. Instale na máquina que hospeda a API do Everything, executando com uma conta Windows autorizada a ler as pastas.

Na primeira instalação, dentro de web-v1:

~~~cmd
npm.cmd run setup
npm.cmd test
npm.cmd start
~~~

O setup gera a senha inicial do login admin uma única vez. O padrão local é http://127.0.0.1:3000. Para a equipe, configure HTTPS conforme o [guia de rede](docs/network.md); com o nome nexus, a URL preparada pelo assistente é https://nexus:3443.

Em atualizações, preserve .env e data/ e não repita os assistentes. A configuração da LAN existente também deve ser preservada.

## Limites do modelo de acesso

As permissões Nexus são verificadas no servidor. Elas não alteram nem reproduzem as permissões individuais do Windows/SMB. Downloads usam a conta Windows do processo após autorizar a conta Nexus. Acesso direto ao compartilhamento continua obedecendo às permissões do servidor de arquivos.

Arquivos, credenciais, contas, chaves privadas e configurações reais ficam fora do repositório. O certificado público da autoridade local pode ser distribuído separadamente, após conferência de origem e impressão digital. As instruções usam exemplos genéricos.

## Estado da validação

Suite da versão 1.1.3: 18 verificações aprovadas, nenhuma falha e 1 subteste de junction ignorado por restrição do ambiente. A interface foi conferida com dados fictícios; o responsável pela instalação relatou funcionamento nos testes locais. Esse relato não representa certificação de todos os cenários de acesso, concorrência ou recuperação. Veja os [resultados e limites](docs/pilot-results.md).
