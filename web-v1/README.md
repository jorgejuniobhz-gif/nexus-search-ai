# Nexus Search AI Web 1.1

Pesquisa via Everything 1.4.1 com árvore de pastas e contas próprias do Nexus. Node.js 24+, Windows, sem dependências npm externas.

Para atualizar, preserve .env e data/ e siga ATUALIZAR.md. O administrador usa login admin e a mesma senha já configurada. Não execute setup novamente.

Veja USUARIOS.md para cadastro, permissões, downloads e limites; DEPLOYMENT.md para acesso local e opção de LAN com HTTPS; VALIDATION.md para testes e limites de verificação.

Na primeira instalação, execute npm.cmd run setup, guarde a senha gerada, execute npm.cmd test e npm.cmd start. Acesse http://127.0.0.1:3000 no host Windows que executa Everything.

Mantenha Everything em 127.0.0.1:8888, sem exposição à LAN e com download HTTP desativado. O Nexus não usa o endpoint de download do Everything. Documentação oficial: https://www.voidtools.com/support/everything/http/

Busca literal com debounce, filtros, paginação, contagens autorizadas, migalhas e mapeamento UNC. A árvore carrega um nível por vez. Selecionar uma pasta mostra conteúdo direto; digitar pesquisa também nas subpastas. A extensão digitada prevalece sobre a categoria. Aspas e controles não são aceitos.

Abrir no Windows copia o caminho para colar no Explorador. Navegadores normalmente bloqueiam abrir arquivos locais; nenhum executável é iniciado no backend.

Sem resultados: confirme que a raiz existe no índice usando o mesmo caminho local ou UNC. Everything indisponível: verifique http://127.0.0.1:8888/?search=teste&json=1 no host. Exige JSON sem redirecionamento; o Nexus não envia Basic Auth upstream. Não amplie permissões para contornar erros de escopo.

Inventários, checkpoints e Onyx existentes não são alterados. Não publique .env, data/, contas, certificados, caminhos reais ou arquivos do acervo.

Para configurar HTTPS com o nome nexus, consulte HTTPS-LAN.md e execute npm.cmd run setup:https -- --name nexus no host já configurado. O assistente não instala confiança nem abre firewall automaticamente.

## Filtro por período (1.1.3)

Use Modificado de e Até para filtrar pela última modificação registrada no índice Everything. As duas datas são opcionais: só início pesquisa daquela data em diante; só fim pesquisa até aquele dia. O intervalo inclui os dois dias completos, no horário local do host Everything. Não é a data mencionada no conteúdo/nome do documento nem a data de criação. Datas inválidas ou início posterior ao fim são recusados no servidor.

Combina com texto, extensão/categoria, tipo e pasta permitida. Ao selecionar uma pasta, preencher o período pesquisa também suas subpastas. A árvore permanece disponível sem filtro de data para navegação. Totais e paginação são calculados pelo Everything já com o período aplicado. Limpar filtros remove as datas e mantém a pasta atual. Arquivos sem data de modificação conhecida no índice podem não aparecer quando o período está ativo.

A atualização usa o .env, contas e certificados existentes. Não execute setup nem setup:https novamente. Encerre o processo antes de substituir os arquivos, reinicie pelo método já utilizado e atualize o navegador com Ctrl+F5.

Sintaxe upstream: [documentação do Everything](https://www.voidtools.com/support/everything/searching/), dm:AAAA-MM-DD..AAAA-MM-DD, dm:>=AAAA-MM-DD e dm:<=AAAA-MM-DD.
