# HTTPS na LAN com o nome Nexus

Use este assistente no Windows que já executa o Nexus e o Everything. Ele é opcional e requer Node.js 24+. Não execute novamente o setup de usuário/senha.

## No host

1. Encerre o Nexus com Ctrl+C. Faça uma cópia privada de .env e data/. Extraia a atualização completa preservando esses arquivos.
2. Na pasta do programa:

    npm.cmd run setup:https -- --name nexus

O assistente cria certificado e chave do servidor em data/tls, protege essa pasta para a conta Windows atual, SYSTEM e administradores, faz backup do .env e configura accounts/HTTPS/3443. Não muda contas, senhas, raízes nem downloads. Não instala certificados no Windows, não altera hosts/firewall, não abre listener e não cria serviço.

O certificado do servidor vale por 1 ano; a data é exibida. A autoridade local vale por 5 anos. Sua chave de assinatura só existe durante a geração e não é salva. O assistente reutiliza certificados válidos existentes e recusa substituir material inválido, de outro nome ou próximo de vencer. Planeje renovação e redistribuição de confiança antes do vencimento.

3. Confie na autoridade local gerada por este host, no perfil Windows que usará o navegador:

    certutil -user -addstore Root C:\Nexus\data\tls\nexus-ca.cer

Esse comando instala confiança na autoridade privada do Nexus para o usuário Windows atual. Confirme a origem e a impressão SHA-256 exibida pelo assistente; não importe certificados obtidos de fontes desconhecidas. Não desative a validação HTTPS nem ignore avisos do navegador.

4. No PowerShell como administrador, libere apenas o HTTPS para a rede local:

    New-NetFirewallRule -DisplayName "Nexus HTTPS LAN" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3443 -RemoteAddress LocalSubnet -Profile Private,Domain

A regra corresponde a perfis de rede Privado/Domínio. Se a Ethernet estiver como Pública, valide o perfil adequado antes de mudar a classificação da rede ou a regra. Não crie regra para 8888.

5. Na pasta do programa:

    npm.cmd start

Acesse https://nexus:3443 usando exatamente esse nome. O nome deve resolver para o host por DNS local ou hosts. Reserve o IP no DHCP para ele não mudar. A porta 8888 do Everything deve continuar exclusivamente em 127.0.0.1; o assistente não altera Everything.

## Em cada computador do colaborador

- Configure nexus no DNS da rede ou no hosts, apontando para o host real.
- Copie somente o arquivo público nexus-ca.cer gerado pelo host, por um canal interno confiável. Não copie .env, a base de usuários nem server-key.pem.
- Importe esse arquivo no usuário Windows que abrirá o navegador:

    certutil -user -addstore Root CAMINHO-DO-ARQUIVO\nexus-ca.cer

- Feche e reabra o navegador e acesse https://nexus:3443.
- Entre com a conta Nexus criada pelo administrador. Contas continuam limitadas às pastas e downloads concedidos.
- Se o navegador não aceitar a cadeia, pare e confira o nome, a data, a impressão e o perfil Windows em que a confiança foi instalada. A homologação no Windows e navegadores reais continua necessária.

## Inicialização e recuperação

A ação do Agendador de Tarefas continua sendo node.exe com argumentos --env-file=.env server.mjs e diretório do programa. O mesmo comando passa a servir HTTPS após a configuração. A conta da tarefa deve poder ler data/tls e o compartilhamento. Não use SYSTEM nem execute várias instâncias.

O Everything também precisa fornecer a API após o reinício. Seu serviço de indexação não equivale à aplicação que hospeda HTTP. Teste a API local e o acesso de um segundo PC após reiniciar; a configuração de inicialização do Everything 1.4.1 precisa ser homologada no host.

Para voltar à configuração anterior, encerre o Nexus e restaure o backup .env.before-https criado pelo assistente. Preserve data/users.json e as chaves; não apague toda a pasta data. A regra de firewall e a confiança instaladas manualmente são gerenciadas separadamente pelo administrador.

## Referências

- [Microsoft certutil](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/certutil)
- [Criptografia e X509 do Node](https://nodejs.org/api/crypto.html)
