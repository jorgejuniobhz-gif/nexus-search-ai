# Atualização completa: árvore e usuários

1. Encerre o Nexus com **Ctrl+C** e faça uma cópia privada da instalação, incluindo .env e data/.
2. Extraia o conteúdo de **nexus-atualizacao-usuarios-arvore.zip** diretamente na pasta que contém package.json e .env. Aceite substituir os arquivos do programa. O ZIP não tem uma pasta externa adicional.
3. **Preserve .env e data/. Não execute setup novamente.** O pacote não contém configuração real nem base de usuários. Sua senha administrativa, raízes e opção de download permanecem iguais.
4. No PowerShell, dentro dessa pasta, execute uma linha por vez:

    npm.cmd test
    npm.cmd start

5. Abra sua URL atual (por padrão http://127.0.0.1:3000) e pressione **Ctrl+F5**.
6. Entre com **usuário admin** e a mesma senha administrativa. Abra **Usuários** e cadastre as pessoas, com senha e pastas permitidas.

O download exige a opção global já existente e a permissão individual. Não é ativado globalmente pela atualização.

As contas são salvas automaticamente em data/users.json; preserve esse arquivo em futuros backups e atualizações. Na primeira utilização, a base é criada ao salvar a primeira conta. O arquivo e suas credenciais não integram o ZIP.

## Uso da árvore

A seta expande subpastas; o nome seleciona a pasta e mostra conteúdo direto. Digitar um termo inclui as subpastas. Todas as pastas permitidas volta à busca geral. Limpar filtros mantém a pasta selecionada. Atualizar recarrega os ramos do índice.

## Acesso em outros PCs

A instalação continua local por padrão. As contas já funcionam no host local. Para acesso na LAN, configure o modo accounts com HTTPS conforme DEPLOYMENT.md. O pacote não abre portas nem muda permissões Windows.

## Reversão

Encerre o processo e restaure os arquivos do programa da cópia anterior. Preserve os dados locais separadamente. Não altere dados das raízes, inventários, checkpoints ou Onyx.

## Sua senha

Depois de entrar, abra Trocar minha senha no topo. Informe a atual, a nova e confirme. Após salvar, entre novamente. Para admin, a senha nova é guardada em data/users.json, sem editar o .env. Preserve os dois em futuras atualizações.
