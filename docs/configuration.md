> Para a versão 2.0, consulte o [guia de busca por conteúdo e atualização Windows](content-search-2.0.md). As instruções abaixo descrevem a base Everything/contas, que permanece disponível.

# Configuração por ambiente

A configuração real fica no .env da instalação. O [exemplo](../config/.env.example) contém valores fictícios. O comando npm.cmd start carrega esse arquivo; alterações exigem reiniciar o processo. Não substitua o .env existente pelo exemplo durante uma atualização.

| Variável | Uso e padrão |
| --- | --- |
| NEXUS_MODE | admin-local por padrão; accounts exige HTTPS para servir a equipe |
| NEXUS_HOST | 127.0.0.1 por padrão; 0.0.0.0 permitido apenas em accounts |
| NEXUS_PORT | 3000 por padrão; 1024–65535, exceto 8888; o assistente HTTPS usa 3443 |
| EVERYTHING_URL | Exclusivamente http://127.0.0.1:8888/, sem caminho extra ou credenciais |
| NEXUS_ADMIN_HASH | Hash scrypt inicial gerado pelo setup; não é a senha em texto |
| NEXUS_ROOTS | Array JSON de 1–20 raízes globais com path e unc opcional |
| NEXUS_DOWNLOADS | false por padrão; true ainda depende da autorização individual |
| NEXUS_USERS_FILE | Opcional; padrão data/users.json ao lado do aplicativo |
| NEXUS_PUBLIC_ORIGIN | Origem HTTPS exata, com nome e porta do modo accounts |
| NEXUS_TLS_CERT | Caminho local do certificado/cadeia PEM do servidor |
| NEXUS_TLS_KEY | Caminho local da chave privada PEM do servidor |

O modo admin-local restringe a conexão ao host local; contas já cadastradas também podem entrar por esse acesso local. Ele não é uma alternativa HTTP para a equipe. O modo accounts valida origem/porta e requer certificado/chave, sem assumir identidade de cabeçalhos enviados por proxy.

NEXUS_ROOTS deve usar o mesmo caminho que aparece no índice Everything. O campo unc mapeia a apresentação de uma raiz local para o compartilhamento correspondente. Concessões dos usuários são intersectadas com essas raízes a cada requisição. Caminhos precisam ser absolutos, locais Windows ou UNC válidos. Mantenha o JSON com barras corretamente escapadas e preserve as aspas do .env gerado pelo assistente.

Se a senha administrativa foi trocada na interface, o hash protegido em data/users.json prevalece sobre o inicial do .env. Preserve os dois arquivos. Variáveis e arquivo-base não contêm uma opção para ignorar autorização, habilitar proxy genérico ou transferir pelo Everything.

Certificados externos ou caminho alternativo de usuários também precisam ser incluídos no backup. O acesso ao filesystem segue a conta Windows do processo. Consulte [instalação](installation.md), [rede](network.md) e [segurança](security.md).
