# Nexus Search AI Web

Nexus Search **2.0** preserva a busca Everything/Node por nome e caminho e acrescenta busca local no conteúdo de PDFs e imagens. Mantém contas, permissões por pasta, árvore, downloads e período de modificação. O componente Python usa PyMuPDF/PaddleOCR e SQLite FTS5, com trechos e páginas apenas das pastas autorizadas. Conteúdo vem desativado por padrão.

Guia principal: [conteúdo 2.0, atualização Windows, testes e reutilização pelo Urbexa](../docs/content-search-2.0.md). Nesta implantação, indexe apenas `teste_nexus.pdf` sintético; não varra o piloto de RH nem importe seu índice.

## Arquitetura em uso

~~~text
Navegador da equipe
        | HTTPS + login Nexus
        v
Backend Nexus (Node.js no Windows)
        |-- sessão, permissões e validação dos filtros
        |-- HTTP JSON em 127.0.0.1:8888 --> Everything 1.4.1
        |                                  índice de nomes/caminhos/datas
        |-- processo Python local --> SQLite FTS5 (páginas autorizadas)
        |-- resultados e totais das pastas autorizadas --> navegador
        '-- download autorizado --> leitura do arquivo no disco/SMB
~~~

O Everything e o backend executam no mesmo host Windows de processamento. O servidor de arquivos fornece o compartilhamento. A equipe acessa somente o Nexus; a porta 8888 permanece no loopback. O modo nomes/caminhos usa metadados do Everything; o modo conteúdo consulta o índice local de páginas extraídas pelo Python.

## Código e documentação

A implementação 2.0 está na branch **codex/nexus-search-2.0**, derivada de **codex/nexus-web-1.0**. Baixe o repositório completo: **web-v1** e **content-index** devem ser pastas irmãs. Preserve `.env`, `data/`, usuários, senhas e certificados existentes; não execute os assistentes de configuração novamente.

- [Código da aplicação 2.0](https://github.com/jorgejuniobhz-gif/nexus-search-ai/tree/codex/nexus-search-2.0/web-v1)
- [Arquitetura e fluxo de autorização](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/architecture.md)
- [Instalação e atualização](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/installation.md)
- [Configuração por ambiente](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/configuration.md)
- [DNS, DHCP, pfSense e HTTPS](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/network.md)
- [Contas, pastas e senhas](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/users.md)
- [Inicialização automática, backup e manutenção](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/operations.md)
- [Diagnóstico de problemas](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/troubleshooting.md)
- [Segurança e privacidade](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/security.md)
- [Testes e resultados](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/pilot-results.md)
- [Evolução do produto](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/roadmap.md)

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

O setup gera a senha inicial do login admin uma única vez. O padrão local é http://127.0.0.1:3000. Para a equipe, configure HTTPS conforme o [guia de rede](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/network.md); com o nome nexus, a URL preparada pelo assistente é https://nexus:3443.

Em atualizações, preserve .env e data/ e não repita os assistentes. A configuração da LAN existente também deve ser preservada.

## Limites do modelo de acesso

As permissões Nexus são verificadas no servidor. Elas não alteram nem reproduzem as permissões individuais do Windows/SMB. Downloads usam a conta Windows do processo após autorizar a conta Nexus. Acesso direto ao compartilhamento continua obedecendo às permissões do servidor de arquivos.

Arquivos, credenciais, contas, chaves privadas e configurações reais ficam fora do repositório. O certificado público da autoridade local pode ser distribuído separadamente, após conferência de origem e impressão digital. As instruções usam exemplos genéricos.

## Estado da validação

Validação 2.0: suíte Node existente e nova integração Python/SQLite; testes Python geram PDFs/imagens fictícios e cobrem extração, índice incremental e isolamento de páginas/totais. A inferência PaddleOCR real depende dos modelos locais e ainda requer validação no venv existente com o sintético. Veja o guia 2.0 para comandos e limites. O relato piloto a seguir é histórico da versão anterior. Veja os [resultados e limites](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/pilot-results.md).
