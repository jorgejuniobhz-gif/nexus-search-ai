# Arquitetura do Nexus Search AI Web 1.1.3

## Componentes

| Componente | Responsabilidade |
| --- | --- |
| Navegador | Interface, calendários, árvore, filtros, paginação e ações sobre resultados |
| Backend Node.js | Login, sessão, autorização por conta, consultas ao índice e downloads |
| Everything 1.4.1 | Índice e busca de nomes, caminhos, tipos, extensões, tamanhos e datas |
| Disco ou compartilhamento SMB | Arquivo original; leitura pelo processo somente após autorizar o download |
| Base local de contas | data/users.json, com hashes de senha e concessões por pasta |
| DNS/DHCP e certificado | Nome estável, endereço estável e confiança HTTPS para os clientes |

## Topologia

~~~text
PCs da equipe -- HTTPS --> Host Windows de processamento
                            |-- Nexus / Node.js
                            |       |-- .env e data/users.json locais
                            |       |-- certificados em data/tls
                            |       '-- leitura autorizada de disco/SMB
                            '-- Everything HTTP JSON
                                  127.0.0.1:8888 (somente local)

Servidor de arquivos -- compartilhamento SMB --> host de processamento
~~~

O backend e o Everything ficam no mesmo host porque a origem upstream é fixa em 127.0.0.1. O host Windows pode ser diferente do servidor que armazena os documentos. A raiz cadastrada precisa coincidir com o caminho existente no índice; o mapeamento UNC de apresentação não transforma uma raiz não indexada em indexada.

## Fluxo de pesquisa

1. O usuário entra com login e senha próprios do Nexus.
2. O servidor valida sessão, conta ativa e versão das permissões.
3. As concessões da conta são intersectadas com as raízes globais do .env.
4. Texto e filtros são validados; a consulta é restrita às pastas autorizadas antes de chegar ao Everything.
5. O Everything devolve uma página e o total já filtrado via JSON.
6. O Nexus valida formato, caminhos e contenção. Uma página fora do escopo é recusada integralmente, incluindo o total.
7. Os itens recebem IDs ligados à sessão e são apresentados no navegador.

Conta sem pastas recebe zero resultados sem consulta upstream. Mudança de permissões durante uma busca impede devolver a resposta com o acesso anterior.

## Árvore e período

A árvore carrega filhos diretos em páginas de até 100 pastas. Ela não recebe filtros por período, permitindo navegar mesmo quando uma pasta tem data antiga. Selecionar uma pasta sem texto, categoria/extensão ou período mostra o conteúdo direto. Preencher um desses filtros pesquisa também nas subpastas; todas as pastas permitidas pesquisa no conjunto de concessões.

O período usa a última modificação do índice. Datas de início e fim são opcionais e seguem dias de calendário do host Everything. Os dois extremos são inclusivos. O filtro é combinado com os demais antes de contagem e paginação; não é aplicado apenas à página visível.

## Fluxo de download e abertura

O navegador pede verificação de acesso para um ID obtido na própria sessão. O backend exige download global e individual habilitados, arquivo dentro das concessões e leitura de um arquivo regular. O download efetivo repete a autorização e a checagem; a transferência sai do filesystem, não do HTTP do Everything. Revogação de conta interrompe streams ativos.

Abrir no Windows copia o caminho para o usuário colar no Explorador. O navegador pode bloquear links locais. O backend não inicia aplicativos nem arquivos no host. O Explorador usa as permissões Windows da pessoa.

## Fronteiras de confiança

As contas são identidades da aplicação, sem integração de identidade Windows por pessoa. A conta Windows do processo precisa apenas das leituras aprovadas e do acesso aos dados locais da aplicação. As permissões do painel controlam o Nexus; as permissões SMB/NTFS controlam o acesso direto ao servidor. Veja [segurança](security.md).

## Conteúdo na versão 2.0

O Node preserva a rota Everything e acrescenta `/api/content-search`. Um processo Python local consulta FTS5 com o escopo de pastas da sessão antes de contar ou paginar. PyMuPDF/PaddleOCR são usados somente pelo indexador separado. [Fluxo, controles, instalação e limites](content-search-2.0.md).
