# Atualizar a instalação existente

1. Na janela em que o Nexus está rodando, pressione **Ctrl+C**.
2. Extraia o conteúdo de `nexus-atualizacao-arvore.zip` diretamente na pasta onde estão o `package.json` e o `.env` da instalação atual. Aceite substituir os arquivos do programa. O ZIP possui os arquivos na raiz, sem uma pasta externa adicional.
3. Preserve o `.env` existente. O pacote não contém `.env` e não redefine a senha, as raízes aprovadas nem a opção de download. Não execute `setup` novamente. Guarde uma cópia de segurança da instalação anterior antes de substituir arquivos.
4. Abra o PowerShell nessa mesma pasta e execute:

   ```powershell
   npm.cmd test
   npm.cmd start
   ```

5. Abra `http://127.0.0.1:3000` e pressione **Ctrl+F5** para atualizar a interface. Entre com a mesma senha.

## Como usar

- Na lateral, clique na seta para expandir uma pasta. Somente suas subpastas imediatas são carregadas. Use “Carregar mais pastas” quando houver mais de 100.
- Clique no nome de uma pasta para ver seus arquivos e subpastas diretos.
- Digite na pesquisa para procurar dentro da pasta selecionada e suas subpastas. As migalhas acima dos resultados indicam a localização.
- Clique em “Todas as pastas permitidas” para pesquisar nas raízes aprovadas. “Limpar filtros” mantém a pasta selecionada.
- “Atualizar” recarrega as raízes e limpa os ramos carregados. A árvore reflete as pastas presentes no índice do Everything.
- A opção de download continua seguindo a configuração local existente e as verificações de leitura do backend.

A atualização mantém a versão de administrador local. O cadastro de usuários individuais e o acesso pela LAN não fazem parte desta atualização.

## Reversão

Encerre o Nexus e restaure os arquivos do programa a partir da cópia anterior. Preserve seu `.env`. Não altere dados das raízes, inventários, checkpoints ou Onyx.
