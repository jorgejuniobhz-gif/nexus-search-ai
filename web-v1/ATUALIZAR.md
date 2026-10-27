# Atualizar o Nexus Web 1.1.3

1. Pare o Nexus. Se uma tarefa agendada o mantém ativo, interrompa a tarefa antes de copiar.
2. Faça backup privado de .env, data/ e caminhos externos de base/certificados configurados.
3. Extraia o ZIP completo nexus-search-ai-web-1.1.3.zip na pasta que contém package.json e server.mjs, substituindo os arquivos de programa. O pacote completo não tem pasta externa adicional. Se baixar o repositório pelo GitHub, selecione a branch main e use o conteúdo de web-v1.
4. Preserve .env, data/users.json, data/tls e backups privados. Não execute setup nem setup:https em uma atualização comum.
5. Na pasta de instalação, execute npm.cmd test. Inicie pelo método já usado: npm.cmd start ou a tarefa agendada, sem abrir duas instâncias.
6. Acesse sua URL atual e pressione Ctrl+F5. Entre com a mesma conta/senha e confira concessões e downloads.

A versão 1.1.3 tem Modificado de e Até, pela última modificação do índice Everything. Início e fim são opcionais e incluem os dias inteiros no horário do host. O filtro combina com texto, categoria/extensão, tipo e pasta antes de contagem/paginação. Aplicar período em uma pasta inclui suas subpastas. A árvore continua navegável sem filtro de data. Limpar filtros remove as datas e mantém a pasta atual.

Atualizar não muda automaticamente DNS, DHCP, firewall, certificados, contas ou pastas. O pacote não inclui .env real, data, acervo ou chave privada. O .cer público da autoridade só pode ser distribuído separadamente depois de recebido/conferido; não está implícito neste pacote.

Para reverter, pare o processo e restaure os arquivos de programa da versão anterior, preservando os dados locais e conferindo compatibilidade antes de iniciar.

Guias: [instalação](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/installation.md), [usuários](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/users.md), [rede/HTTPS](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/network.md), [operação](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/operations.md) e [validação](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/pilot-results.md).
