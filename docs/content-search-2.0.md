# Nexus Search 2.0 — busca local por conteúdo

Código na branch `codex/nexus-search-2.0`, a partir de `codex/nexus-web-1.0`.
A pesquisa Everything/Node por nome, caminho, tipo e período continua disponível.
O seletor da interface acrescenta conteúdo de PDF/imagens, com página e trecho.
Os resultados de conteúdo contam **páginas encontradas**, não arquivos distintos.
Busca textual literal por palavras, combinadas com AND, sem operadores FTS,
ranking global, pesquisa semântica, IA remota ou upload de documentos.

## Componentes e armazenamento

`content-index/nexus_content/extract.py` exporta `Extractor` e `PageText` sem
dependência de usuários, servidor HTTP ou Nexus. O Urbexa pode instalar
`pip install ./content-index` e consumir `list(Extractor()(arquivo))`.
OCR é carregado apenas quando necessário; `Extractor(ocr=adaptador)` permite
reutilizar outro mecanismo ou testar sem baixar modelos. PyMuPDF lê texto nativo
e renderiza imagens; PaddleOCR recebe arrays BGR locais para páginas sem texto,
com imagens e documentos de imagem. Páginas mistas preservam o texto nativo e o
texto reconhecido. O adaptador suporta PaddleOCR 2.x (`ocr`) e 3.x (`predict`).
Limites iniciais: 2.000 páginas, 30 milhões de pixels renderizados por página,
2 milhões de caracteres por página. Exceder o limite marca erro no documento.

SQLite novo, esquema versão 1, WAL e FTS5: `documents` mantém caminho absoluto,
chave normalizada, raiz, tamanho, mtime em nanossegundos, SHA-256, status e erro
genérico; `pages` mantém página (base 1), texto e método; `page_fts` indexa texto
por página, com triggers de inserção/remoção. Texto não é retornado por endpoints
de administração nem servido como arquivo estático. Os termos ignoram acentos.

Cada execução calcula SHA-256 dos arquivos selecionados. Bytes idênticos evitam
extração/OCR; alterações substituem todas as páginas em transação. Erro de
extração elimina o texto anterior e registra `extraction_failed`; uma execução
posterior tenta novamente. `--force` reextrai após mudança de modelos/opções.
`--scan --production` enumera uma raiz explícita e remove documentos ausentes
**somente depois de completar a enumeração**. Falha de acesso na enumeração
aborta sem remover registros. Rename equivale a inserir novo e remover antigo.
Use raízes de indexação não sobrepostas. Não execute dois indexadores ao mesmo
tempo; configure a tarefa para não iniciar uma segunda instância.
Os caminhos indexados devem usar o mesmo namespace das concessões Nexus
(letra de unidade ou UNC). Uma raiz UNC não é convertida automaticamente para
a letra de unidade correspondente, ou vice-versa.

## Autorização

O Node deriva raízes de `accountRoots` a cada requisição, usando os mesmos
cadastros da versão anterior. O navegador não escolhe as concessões. O Python
recebe o escopo confiável via stdin, abre SQLite em modo somente leitura e
materializa apenas páginas correspondentes autorizadas antes de calcular total
ou paginar. Ordem por caminho/página; não usa estatísticas globais do FTS para
ranking. Pastas sem concessão retornam vazio sem consultar o índice.

O backend valida novamente os caminhos recebidos, cria IDs por sessão e usa os
mesmos controles de download. Revogar/desativar conta encerra sessões; uma
pesquisa em andamento revalida a sessão antes de entregar trechos ou totais.
Erros HTTP não incluem exceções, nomes, caminhos de documentos ou saída Python.
Consultas têm prazo, limite de saída e compartilham o limite de concorrência da
busca Everything. Snippets são renderizados com `textContent`, sem HTML.

Symlinks/junções/reparse points e seus ancestrais são recusados na extração e
consulta. Arquivos removidos ou com tamanho/mtime diferente ficam ocultos antes
da próxima sincronização. Isso não substitui isolamento do sistema operacional:
as permissões são **por pasta no Nexus**, não uma consulta à ACL NTFS individual
do usuário a cada resultado. O serviço Windows deve ler apenas o acervo aprovado;
ninguém não confiável pode alterar arquivos, índice ou configuração durante uma
consulta. Proteja SQLite, WAL, SHM e backups com ACL restrita à conta do serviço
e administradores, fora de raízes pesquisáveis/compartilhadas; use disco cifrado.
O índice contém texto sensível e não deve ser publicado, anexado ou versionado.

## Atualização Windows preservando a instalação

Todos os caminhos abaixo são **exemplos fictícios**. Adapte-os privadamente.
Não rode `setup` ou `setup:https`, não substitua `.env`, `data/users.json`, TLS,
senhas, contas, concessões, tarefa existente, DNS, firewall ou Everything.

1. Pare apenas o Nexus e faça backup privado da configuração, `data/` e TLS.
2. Baixe a branch `codex/nexus-search-2.0` inteira. Mantenha `web-v1` e
   `content-index` como pastas irmãs. Copiar apenas os arquivos de `web-v1`
   deixa o componente Python ausente. Se a instalação atual é plana, coloque
   `content-index` ao lado da pasta que contém `server.mjs` (um nível acima).
3. Copie os arquivos de programa preservando os dados locais. Reutilize o venv
   Python 3.11 com PaddleOCR/PyMuPDF já instalado. Não atualize automaticamente
   esse ambiente. Confira FTS5 e imports com o comando abaixo.
4. Use **um índice novo**, separado do protótipo. Não importe o índice piloto:
   ele pode conter documentos fora do escopo aprovado. Não acesse nem varra a
   pasta piloto de RH. Nesta implantação, selecione apenas `teste_nexus.pdf`.
5. Valide o PDF sintético em pasta isolada, depois configure as três variáveis
   `NEXUS_CONTENT_*` sem alterar as demais. Execute `npm.cmd test` em `web-v1`.
6. Reinicie pelo método existente, Ctrl+F5, confirme busca Everything, contas,
   pastas e downloads. Valide conteúdo com duas contas fictícias de escopos
   diferentes, incluindo conta sem concessão e revogação.

```powershell
# Dentro da pasta content-index; caminhos fictícios, nada de varredura de RH.
$pythonOCR = 'C:\ExampleNexus\OCR\.venv\Scripts\python.exe'
& $pythonOCR -c "import sqlite3,pymupdf,paddleocr; c=sqlite3.connect(':memory:'); c.execute('CREATE VIRTUAL TABLE t USING fts5(text)'); print('Dependencias e FTS5 OK')"
& $pythonOCR -m nexus_content index --db 'C:\ExampleNexus\private-index\content-v2.sqlite' --root 'C:\ExampleSynthetic' --file 'C:\ExampleSynthetic\teste_nexus.pdf'
# Repetir deve informar unchanged=1. Nenhuma pasta é varrida nesse comando.
```

```dotenv
NEXUS_CONTENT_ENABLED=true
NEXUS_CONTENT_PYTHON=C:\ExampleNexus\OCR\.venv\Scripts\python.exe
NEXUS_CONTENT_DB=C:\ExampleNexus\private-index\content-v2.sqlite
```

Os pais do arquivo SQLite devem existir. Logs JSON mostram somente contadores;
`errors>0` retorna código de saída 1 e remove o texto antigo do documento afetado.
PDF cifrado, ilegível, dependência/modelo OCR ausente e limites excedidos ficam
com status `error`; examine o ambiente local sem copiar documentos para logs.
PaddleOCR pode baixar modelos públicos no primeiro uso: pré-provisione/cache os
modelos antes de operar offline. Para instalação nova, siga os guias oficiais de
[PaddlePaddle](https://www.paddlepaddle.org.cn/en/install/quick),
[PaddleOCR](https://www.paddleocr.ai/main/en/quick_start.html) e
[PyMuPDF](https://pymupdf.readthedocs.io/en/latest/installation.html).
`--model-options arquivo.json` aceita opções locais de diretórios de modelos
compatíveis com a versão instalada. Nenhum documento é enviado aos provedores.

Atualização incremental segura desta implantação: agende o mesmo comando
`index --file ...teste_nexus.pdf`, com diretório de trabalho `content-index`,
conta de serviço existente e sem instâncias simultâneas. Para retirar o sintético:

```powershell
& $pythonOCR -m nexus_content remove --db 'C:\ExampleNexus\private-index\content-v2.sqlite' --root 'C:\ExampleSynthetic' --file 'C:\ExampleSynthetic\teste_nexus.pdf'
```

O código também oferece varredura administrativa de uma raiz explícita via
`index --scan --production --root ... --db ...`; ela **não é parte desta
implantação**, exige acervo aprovado e nunca deve apontar à pasta piloto de RH.
Por padrão o CLI exige `--file` e aceita apenas o nome `teste_nexus.pdf`.

Reversão: `NEXUS_CONTENT_ENABLED=false` remove o modo conteúdo sem mudar
Everything ou usuários. Para reverter código, restaure os arquivos de programa
anteriores, mantendo `.env`, dados e TLS privados; o SQLite novo é independente.

## Testes reproduzíveis e limites de validação

```powershell
# Na raiz do repositório, ambiente com PyMuPDF e NumPy.
$env:PYTHONPATH = "$PWD\content-index"
& $pythonOCR -m unittest discover -s content-index/tests -v
$env:NEXUS_TEST_PYTHON = $pythonOCR
Set-Location web-v1
node --test
```

Fixtures são geradas em diretórios temporários e eliminadas. Não há PDFs,
imagens, índices, usuários ou segredos reais nos commits. Testes Python cobrem
SHA-256, alteração/erro/recuperação, rename/remoção, FTS, contagens e paginação por
escopo, filtros e links; PDFs reais sintéticos exercitam texto, raster e página
mista com OCR injetado. Os adaptadores PaddleOCR 2/3 têm respostas simuladas.
Os testes Node preservam os casos anteriores e acrescentam isolamento, erros,
revogação em voo e um processo Python/SQLite real. CI Windows/Python 3.11
reproduz esses testes sem baixar modelos OCR. A extração nativa e a busca FTS5 no ambiente Python existente foram validadas
manualmente pelo responsável com o PDF sintético, conforme o registro abaixo.
A inferência PaddleOCR real não foi executada; o responsável optou por pular
o teste digitalizado nesta etapa.

Resultado local em Windows nesta implementação: **22 testes Node aprovados**
(incluindo processo Python/FTS5 real e bloqueio de junction), **7 testes Python
aprovados e 1 pulado** por falta de privilégio para criar symlink. O caminho de
reparse point também foi exercitado com atributo simulado e junction real.

## Validação manual informada em 27/10/2026

O responsável pela instalação confirmou os seguintes resultados no Windows:

- Criação explícita de `teste_nexus.pdf` com texto inteiramente fictício.
- Indexação com `indexed=1`, `unchanged=0`, `errors=0` e `removed=0`.
- Busca local por `vistoria`: `total=1`, página 1 e trecho sintético esperado.
- Atualização do backend e interface, inicialização e busca por conteúdo na web.
- Conta autorizada encontrou o sintético; uma conta sem acesso à pasta sintética
  não recebeu o resultado. Nenhum nome de pessoa foi registrado aqui.

A instalação existente usava arquivos Node diretamente na pasta principal.
Foram preservados configuração, dados e usuários; os arquivos de programa foram
copiados de `web-v1` após backup. Como `content-index` ficou dentro da pasta
principal, o caminho relativo `worker` em `content.mjs` foi ajustado localmente
de `../content-index/` para `./content-index/`. Esse ajuste se aplica somente
à distribuição plana; o layout padrão com pastas irmãs mantém o caminho original.

São resultados relatados pelo responsável, não uma nova execução automatizada
ou auditoria de todas as contas. Não foram indexados documentos reais de RH.
Por solicitação explícita do responsável, o teste de inferência PaddleOCR com
uma página digitalizada sintética foi **pulado**. OCR digitalizado permanece
**não validado no ambiente instalado**; o sucesso da extração de texto nativo
não comprova a inferência OCR. Não foi feita nova varredura do acervo.
