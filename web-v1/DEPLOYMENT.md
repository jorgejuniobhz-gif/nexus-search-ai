# Execução e implantação na LAN

## Implantação disponível agora

O Web 1.0 roda no host Windows de processamento, em loopback e com um único administrador. Essa restrição é implementada no código, não apenas uma recomendação. Não há URL LAN válida para a equipe nesta entrega. Manter a instalação no Windows evita confundir o `127.0.0.1` do WSL com o host do Everything e permite leitura direta dos arquivos pela conta Windows do processo.

Para reinicialização automática, o administrador pode criar uma tarefa no Agendador de Tarefas com a conta Windows aprovada, diretório de trabalho desta pasta e ação `node.exe --env-file=.env server.mjs`. Aponte para o caminho absoluto do Node instalado; não use conta SYSTEM nem “executar com privilégios mais altos”. Não foi criada tarefa nem alterado firewall automaticamente. Sessões são reiniciadas a cada execução.

## Requisitos para a próxima liberação multiusuário

Não basta colocar autenticação no proxy. Antes de liberar uma porta LAN, implementar e testar conjuntamente:

1. Identidade Windows/AD validada (por exemplo, IIS Windows Authentication com anônimo desativado), transporte HTTPS e canal backend autenticado que não aceite cabeçalhos de usuário enviados pelo cliente.
2. Autorização server-side por SID/grupos e regras de raiz antes de consultar. Tratar metadados de nomes e caminhos como dados confidenciais.
3. Verificação efetiva NTFS **e** compartilhamento SMB por usuário. Usar impersonação/delegação corretamente configurada ou um agente de acesso que avalie a identidade real. Ler com conta de serviço privilegiada e presumir permissão é proibido.
4. Filtrar resultados antes de devolvê-los e calcular a contagem exclusivamente sobre resultados autorizados. Nunca revelar totais globais, breadcrumbs, nomes de pais, snippets ou mensagens de erro de áreas não autorizadas. Contagens do índice geral não podem ser reutilizadas após filtro de ACL.
5. Vincular IDs e autorização à identidade e sessão; repetir checagem em navegação, abertura e cada download. Implementar revogação de grupos/permissões, auditoria protegida sem conteúdo sensível e testes com ao menos dois usuários de permissões distintas.
6. Avaliar junctions, links, concorrência de alterações, volumes remotos, aliases de caminhos e delegação de credenciais. Revisar o código e homologar com arquivos sintéticos antes de dados reais.
7. Só após os testes: liberar apenas a porta HTTPS do frontend para sub-redes aprovadas. Everything permanece em **127.0.0.1:8888**, sem proxy genérico e sem rota de download para ele. Backend continua inacessível diretamente pela LAN.

A versão atual rejeita `NEXUS_MODE` diferente de `admin-local`. A liberação exige implementação adicional; não há variável “permitir LAN” ou bypass de ACL.

## Preservação e reversão

Instalar em pasta própria. Não modificar Everything além das opções aprovadas de bind/download; não alterar inventário, checkpoints, Onyx, bancos ou índices existentes. Para reverter, encerrar o processo Nexus e remover apenas sua eventual tarefa agendada. Não excluir os dados das raízes. A configuração `.env` fica fora do Git e do pacote de entrega.
