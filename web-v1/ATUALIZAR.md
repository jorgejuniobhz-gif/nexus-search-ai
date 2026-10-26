# Atualização 1.1.3: filtro por período

1. Encerre o Nexus com **Ctrl+C** e faça uma cópia privada da instalação, incluindo .env e data/.
2. Extraia o conteúdo de **nexus-atualizacao-periodo-1.1.3.zip** diretamente na pasta que contém package.json e .env. Aceite substituir os arquivos do programa. O ZIP não tem uma pasta externa adicional.
3. **Preserve .env e data/. Não execute setup novamente.** O pacote não contém configuração real nem base de usuários. Sua senha administrativa, raízes e opção de download permanecem iguais.
4. No PowerShell, dentro dessa pasta, execute uma linha por vez:

    npm.cmd test
    npm.cmd start

5. Abra sua URL atual (por padrão http://127.0.0.1:3000) e pressione **Ctrl+F5**.
6. Entre com **usuário admin** e a mesma senha administrativa. Abra **Usuários** e cadastre as pessoas, com senha e pastas permitidas.

O download exige a opção global já existente e a permissão individual. Não é ativado globalmente pela atualização.

As contas são salvas automaticamente em data/users.json; preserve esse arquivo em futuros backups e atualizações. Na primeira utilização, a base é criada ao salvar a primeira conta. O arquivo e suas credenciais não integram o ZIP.

## Uso da árvore

A seta expande subpastas; o nome seleciona a pasta e mostra conteúdo direto. Digitar um termo ou aplicar extensão/categoria/período inclui as subpastas. Todas as pastas permitidas volta à busca geral. Limpar filtros mantém a pasta selecionada. Atualizar recarrega os ramos do índice.

## Acesso em outros PCs

A instalação continua local por padrão. As contas já funcionam no host local. Para acesso na LAN, configure o modo accounts com HTTPS conforme DEPLOYMENT.md. O pacote não abre portas nem muda permissões Windows.

## Reversão

Encerre o processo e restaure os arquivos do programa da cópia anterior. Preserve os dados locais separadamente. Não altere dados das raízes, inventários, checkpoints ou Onyx.

## Sua senha

Depois de entrar, abra Trocar minha senha no topo. Informe a atual, a nova e confirme. Após salvar, entre novamente. Para admin, a senha nova é guardada em data/users.json, sem editar o .env. Preserve os dois em futuras atualizações.

## Filtro por período (1.1.3)

Use Modificado de e Até para filtrar pela última modificação registrada no índice Everything. As duas datas são opcionais: só início pesquisa daquela data em diante; só fim pesquisa até aquele dia. O intervalo inclui os dois dias completos, no horário local do host Everything. Não é a data mencionada no conteúdo/nome do documento nem a data de criação. Datas inválidas ou início posterior ao fim são recusados no servidor.

Combina com texto, extensão/categoria, tipo e pasta permitida. Ao selecionar uma pasta, preencher o período pesquisa também suas subpastas. A árvore permanece disponível sem filtro de data para navegação. Totais e paginação são calculados pelo Everything já com o período aplicado. Limpar filtros remove as datas e mantém a pasta atual. Arquivos sem data de modificação conhecida no índice podem não aparecer quando o período está ativo.

A atualização usa o .env, contas e certificados existentes. Não execute setup nem setup:https novamente. Encerre o processo antes de substituir os arquivos, reinicie pelo método já utilizado e atualize o navegador com Ctrl+F5.

Sintaxe upstream: [documentação do Everything](https://www.voidtools.com/support/everything/searching/), dm:AAAA-MM-DD..AAAA-MM-DD, dm:>=AAAA-MM-DD e dm:<=AAAA-MM-DD.
