Para usar a autoridade privada gerada localmente pelo assistente, siga HTTPS-LAN.md. A alternativa abaixo usa certificado fornecido por sua infraestrutura.

# Execução local e LAN

## Padrão preservado

A atualização mantém o .env existente e o bind em 127.0.0.1. Todas as contas e o painel funcionam no modo admin-local somente no próprio PC. Não é necessário WSL. Execute no Windows que hospeda Everything, com uma conta Windows que tenha a leitura necessária. Não use SYSTEM nem elevação desnecessária.

Nenhuma tarefa, serviço, porta ou firewall é alterado automaticamente. Para iniciar após reinício, o administrador pode configurar o Agendador de Tarefas com o caminho absoluto do Node, argumentos --env-file=.env server.mjs, diretório do programa e a conta Windows aprovada.

## LAN com autenticação própria e HTTPS

O modo escolhido usa login/senha e concessões de pastas no Nexus, sem AD. Para acessar de outros PCs:

1. Configure nome/IP estável e obtenha certificado de servidor emitido por uma CA confiável pelos PCs da equipe, incluindo esse nome/IP. Guarde a chave privada apenas no host, com permissões restritas. Não desative validação de certificado nos clientes.
2. Preserve o .env e configure o modo accounts, bind, origem e TLS. Exemplo fictício:

    NEXUS_MODE='accounts'
    NEXUS_HOST='0.0.0.0'
    NEXUS_PORT='3443'
    NEXUS_PUBLIC_ORIGIN='https://nexus.example.internal:3443'
    NEXUS_TLS_CERT='C:\ExampleCertificates\server-chain.pem'
    NEXUS_TLS_KEY='C:\ExampleCertificates\server-key.pem'

3. Use certificado/cadeia e chave em PEM. A porta da origem deve coincidir com a porta do Nexus. A URL não pode conter credenciais. Ausência de HTTPS impede inicialização no modo accounts.
4. Reinicie e use a URL configurada também no host local. O próprio Node serve HTTPS; não há frontend HTTP nem proxy reverso. Outro Host/IP/porta será recusado.
5. Restrinja no firewall a entrada na porta HTTPS escolhida às sub-redes da equipe. Não crie exposição à internet. **Everything continua em 127.0.0.1:8888**, sem entrada na 8888 e sem proxy genérico ou download HTTP.
6. Entre como admin com a senha preservada e crie contas individuais. Downloads exigem permissão global e individual.
7. Homologue com duas contas e arquivos sintéticos: nomes, totais, árvore, downloads, revogação durante sessão e persistência após reinício. Confirme que a base de usuários não é acessível pela web.

O pacote não contém certificado/chave, não ativa LAN e não modifica firewall. A leitura usa a conta Windows do processo após autorizar a conta Nexus. Se precisar exigir ACL Windows por identidade individual, é necessária outra integração; esse não é o modelo atual.

## Ambiente

- NEXUS_MODE: admin-local por padrão ou accounts com HTTPS.
- NEXUS_HOST: 127.0.0.1 por padrão; 0.0.0.0 permitido apenas em accounts.
- NEXUS_PORT: padrão 3000, mínimo 1024, diferente de 8888.
- EVERYTHING_URL: somente http://127.0.0.1:8888/.
- NEXUS_ADMIN_HASH: credencial scrypt do administrador, gerada localmente.
- NEXUS_ROOTS: array JSON de raízes globais com path e unc opcional; concessões individuais devem estar dentro delas.
- NEXUS_DOWNLOADS: false por padrão; true habilita conforme a conta.
- NEXUS_USERS_FILE: opcional; padrão data/users.json ao lado do programa.
- NEXUS_PUBLIC_ORIGIN: origem HTTPS exata com a mesma porta do Nexus no modo accounts.
- NEXUS_TLS_CERT / NEXUS_TLS_KEY: caminhos de certificado/cadeia e chave privada PEM.

Edite .env e reinicie para aplicar. Preserve as aspas simples externas e o JSON das raízes. As contas usam data/ por padrão, não a pasta de documentos pesquisados.

## Preservação e recuperação

Proteja .env, data/, chave TLS e backups com permissões NTFS. Nunca publique esses arquivos. Corrupção da base impede iniciar; restaure o backup sem apagar a base para contornar o erro.

A autorização Nexus é independente dos compartilhamentos Windows existentes. Inventário, checkpoints, Onyx, índices e bancos não são alterados. Para retornar ao acesso local, encerre, ajuste admin-local/127.0.0.1/porta local e retire a regra de entrada que o administrador criou. Preserve as contas e os arquivos das raízes.
