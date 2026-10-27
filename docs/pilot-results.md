# Testes e resultados — Web 1.1.3

## Validação automatizada

A suite node --test teve 19 verificações: **18 aprovadas, 0 falhas e 1 subteste ignorado**. A fixture de junction não pôde ser criada por restrição do ambiente; a verificação no host real continua necessária.

Foram exercitados:

- Configuração local e exigência de HTTPS/origem exata para modo LAN.
- Caminhos Windows, contenção, travessia, ADS, nomes de dispositivo e respostas fora do escopo.
- Login, cookies, origem, revogação e recusa de identidade encaminhada por proxy.
- Duas contas com pastas distintas; isolamento de árvore, resultados, totais e downloads.
- Conta sem concessões; estado desativado; redefinição/troca de senha e persistência do hash administrativo.
- Gravação atômica e concorrência da base; recusa de base inválida.
- Download por ID de sessão, nova checagem de leitura e interrupção de transferência após revogação.
- Árvore de filhos diretos, paginação e recusa de resposta upstream malformada.
- TLS com validação normal: autoridade desconhecida recusada, autoridade/nome corretos aceitos.
- Datas reais, anos bissextos, limites 1601–9999, formato/injeção, intervalo invertido, mesmo dia e limites opcionais.
- Período combinado com escopo antes de contagem/paginação; árvore independente do período.

As fixtures de API/acervo são sintéticas. O teste do período cobre o primeiro instante do dia inicial e 23:59:59 do último no simulador; isso não comprova o parser ou atualização do índice Everything real.

## Interface

Navegador conferido com dados fictícios: login, árvore por nível, conteúdo direto, pesquisa recursiva, paginação, cadastro/edição de conta, concessão de subpasta, download por conta, troca própria de senha, calendários, combinação de filtros, aviso de período invertido e limpeza. Gestão de usuários também foi conferida em larguras de 1280 e 390 pixels.

## Retorno da instalação

O responsável informou funcionamento em testes locais e carregamento bem-sucedido da atualização 1.1.3. Durante a implantação, foram realizados os passos de nome na LAN, reserva de endereço e confiança do certificado no navegador, sem publicar os valores operacionais no repositório.

Esse retorno não substitui teste independente de todas as contas, permissões, casos de data, carga ou recuperação. Não há benchmark de latência ou capacidade comprovada para uma quantidade específica de usuários simultâneos.

## Homologação no host

Antes de ampliar o uso, verificar com arquivos autorizados de datas conhecidas: primeiro/último dia, mesmo dia, só início, só fim, ausência de data e atualização do índice. Validar também leitura NTFS/SMB pela conta real do processo, links/junctions, firewall, certificados e acesso em outro PC.

Após reiniciar o Windows, confirmar HTTP JSON local do Everything, inicialização do Nexus, conta de execução, sessão de colaborador e download permitido/negado. Executar teste de restauração de backup em ambiente isolado.

## Reproduzir a suite

Na pasta que contém package.json:

~~~cmd
npm.cmd test
~~~

Os testes criam arquivos/contas sintéticos e listeners de loopback temporários. Precisam de permissão para conexões locais. Não apontam para o acervo real e não alteram a configuração do Everything.
