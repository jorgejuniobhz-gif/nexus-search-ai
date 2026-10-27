> Para a versão 2.0, consulte o [guia de busca por conteúdo e atualização Windows](content-search-2.0.md). As instruções abaixo descrevem a base Everything/contas, que permanece disponível.

# Operação e manutenção

## Inicialização automática no Windows

Use o Agendador de Tarefas no host que executa a aplicação. A tarefa deve executar com uma conta Windows aprovada, capaz de ler o compartilhamento, .env, base de contas e chave TLS. Não use SYSTEM para acessar compartilhamentos de rede. Não depende de unidade mapeada em outra sessão; prefira o caminho UNC aprovado quando aplicável.

Configure:

| Campo | Configuração |
| --- | --- |
| Gatilho | Ao iniciar o computador, com atraso para a rede ficar disponível |
| Programa | Caminho absoluto do node.exe instalado |
| Argumentos | --env-file=.env server.mjs |
| Iniciar em | Pasta absoluta que contém package.json, .env e server.mjs |
| Conta | Conta Windows autorizada para essa execução |
| Sessão | Executar independentemente de login, com credenciais e acesso à rede adequados |
| Concorrência | Não iniciar nova instância se a tarefa já estiver em execução |
| Falha | Configurar reinício com intervalo apropriado |
| Duração | Remover limite que encerre a aplicação após algumas horas |

Não copie placeholders como caminhos reais. O programa pode estar em uma pasta exclusiva definida pelo administrador; use o caminho existente na máquina. O modo da aplicação e o HTTPS continuam vindo do .env, sem mudar os argumentos da tarefa.

A aplicação não cria essa tarefa automaticamente. Se iniciar pelo Agendador, não abra outra instância com npm.cmd start na mesma porta. Para atualizar, interrompa a tarefa e o processo antes da cópia, e inicie novamente ao concluir.

## Everything após reinício

O serviço de indexação do Everything não garante que sua aplicação HTTP esteja em execução. Verifique a inicialização automática da instância que fornece JSON, sempre no loopback. Valide uma consulta à API local e uma busca autenticada pelo Nexus depois de reiniciar. Não crie uma exposição de rede para compensar falhas de inicialização.

## Backup

Faça backup privado de .env, data/users.json, data/tls, backups locais da configuração e quaisquer caminhos externos definidos em NEXUS_USERS_FILE/NEXUS_TLS_CERT/NEXUS_TLS_KEY. Inclua os arquivos de programa ou registre a versão exata usada. A cópia de dados locais deve ocorrer com o processo parado ou por mecanismo que garanta consistência.

Proteja os backups com as mesmas restrições da instalação. Teste restauração em ambiente isolado, sem reutilizar a porta do serviço ativo e sem expor dados a usuários de teste. Reiniciar encerra as sessões em memória.

## Mudanças de configuração

Edite .env localmente e reinicie. Mudar raízes globais pode invalidar concessões existentes; confira os usuários após a alteração. Mudar nome/origem/porta exige coerência entre DNS, certificado, firewall e NEXUS_PUBLIC_ORIGIN. O backend recusa outro Host ou origem.

Não execute setup em uma instalação existente para tentar revelar uma senha: ele não sobrescreve o .env. Use os fluxos de troca ou redefinição documentados. Preserve o hash administrativo atualizado em data/users.json.

## Certificados

Acompanhe a validade da folha e da autoridade. O assistente local não salva a chave de assinatura da autoridade nem faz renovação automática. Uma substituição de autoridade exige redistribuir confiança nos clientes. Não apague data/ nem gere material novo sem planejar a atualização de configuração e confiança.

## Verificação operacional

Confira periodicamente disponibilidade do processo, API JSON local, acesso HTTPS, validade do certificado, leitura das raízes e sucesso dos backups. A versão atual não inclui painel de monitoramento, auditoria persistente de pesquisas ou sincronização com um diretório de identidades.

O servidor permite até 3 consultas upstream simultâneas, timeout de 8 segundos e resposta de até 2 MB por consulta. Carga e lentidão do índice podem produzir erro ou limite de concorrência. Investigue o índice e o acesso ao compartilhamento antes de ampliar recursos ou permissões.
