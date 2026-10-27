# Usuários, pastas e senhas

## Administrador

O login principal é admin. A senha inicial é gerada uma vez por npm.cmd run setup. Atualizar o programa ou instalar o certificado não muda a senha. O painel de contas comuns não remove nem promove alguém a administrador principal.

## Cadastrar colaborador

1. Entre como admin e abra Usuários → Novo usuário.
2. Informe nome, login e senha inicial. O login tem 3–32 caracteres: letras, números, ponto, hífen e sublinhado; é normalizado para minúsculas. A senha tem 12–128 caracteres.
3. Marque as pastas permitidas pela árvore. Uma pasta inclui todos os descendentes; não há exclusão de uma subpasta dentro de uma concessão maior. Nenhuma seleção significa nenhum acesso.
4. Mantenha a conta ativa. Marque Permitir download somente se o conteúdo dessas pastas puder ser recebido pela pessoa.
5. Salve e forneça as credenciais por um canal privado.

Concessões precisam estar dentro das raízes globais do .env. Há limite de 200 contas comuns e 20 pastas por conta. A interface não oferece autocadastro ou exclusão permanente; permite edição e desativação.

## Editar e redefinir senha

Abra uma conta no painel. É possível mudar nome, login, pastas, download e estado ativo. Deixe a senha vazia para mantê-la; preencha para redefinir sem conhecer a anterior. Senhas existentes não são recuperadas nem exibidas.

Qualquer alteração invalida as sessões da conta e interrompe downloads ativos. Desativar impede novos logins; reativar exige novo login.

## Trocar a própria senha

O botão Trocar minha senha está disponível para admin e colaboradores. Exige senha atual, nova e confirmação. Ao salvar, todas as sessões da conta são encerradas. A troca administrativa persiste um hash em data/users.json que passa a prevalecer sobre o hash inicial do .env. Preserve ambos nos backups; apagar a base não é um método de recuperação.

## O que o usuário vê

Árvore, resultados, raízes e totais são restritos às concessões pelo backend. Uma conta sem pastas não consulta o índice. Navegar ou alterar a URL não autoriza novas pastas. As pesquisas usam nomes/caminhos e metadados, não o conteúdo dos documentos.

Modificado de e Até limitam a última modificação registrada no Everything, com início/fim opcionais. Os dois dias são incluídos inteiros no horário do host. O filtro não interpreta datas escritas dentro do arquivo ou no seu nome. Não usa a data de criação. Limpar filtros mantém a pasta atual.

Ao selecionar uma pasta sem texto, categoria/extensão ou período, a lista mostra seu conteúdo direto. Aplicar um desses filtros inclui subpastas. A extensão digitada tem prioridade sobre a categoria. A árvore permanece navegável independentemente do período.

## Downloads e originais

Download depende de NEXUS_DOWNLOADS=true no .env e permissão individual; admin tem permissão individual, mas também depende da opção global. O botão Verificar download confirma a leitura e disponibiliza a ação; o servidor revalida ao transferir. Não há acesso irrestrito por URL ou download via Everything.

Abrir no Windows copia o caminho para colar no Explorador. A abertura depende do acesso Windows da pessoa e do aplicativo associado ao arquivo. Copiar o caminho não concede permissão no servidor.

## Limites das permissões

Contas Nexus não são contas Windows. O backend lê arquivos com a conta Windows do processo, após conferir a concessão da conta Nexus. O painel não altera ACLs NTFS/SMB; o acesso direto ao compartilhamento permanece conforme a configuração do servidor. Para restringir também esse acesso, administre as permissões do compartilhamento separadamente.

Conceder uma pasta pode revelar nomes e caminhos confidenciais mesmo sem habilitar download. Cadastre somente concessões aprovadas. As sessões expiram após 30 minutos e não sobrevivem ao reinício do processo.
