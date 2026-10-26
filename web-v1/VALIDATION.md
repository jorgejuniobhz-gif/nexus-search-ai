# Validação — Web 1.1

17 verificações: **16 aprovadas, nenhuma falha e 1 subteste de junction ignorado** porque o ambiente atual não permite criar a fixture (EPERM). A leitura de arquivo sintético, rejeição de diretório/arquivo ausente e contenção de caminhos passaram. O bloqueio de junctions continua implementado e havia passado na entrega inicial; repetir em um Windows que permita a fixture.

## Cobertura automatizada

- Configuração falha para LAN sem HTTPS, origem HTTP, upstream arbitrário e ausência de segredo; o Everything continua fixo em loopback.
- Validação de caminhos Windows/UNC, travessia, dispositivos, streams alternativos, escopo e paginação.
- Autenticação, origem, rejeição de proxy, sessão, IDs aleatórios, download e nova checagem de leitura.
- Árvore autenticada com filhos imediatos, paginação e rejeição de resultados de outro nível.
- Base de usuários persistente com scrypt/salt, sem senha em texto claro ou hash na API; duplicidade de login, senha curta, pasta fora do escopo, conflito de edição e falha de gravação.
- Duas contas com pastas distintas: raízes, árvore, nomes, totais e IDs de download isolados; conta comum não acessa administração.
- Download depende das duas permissões: global e individual.
- Resposta upstream fora do escopo não revela arquivo nem total global.
- Desativação, mudança de senha e de pastas revogam sessões e impedem devolver buscas em andamento com permissões antigas.
- Conta sem pastas retorna zero sem consultar o índice.
- Desativar a conta interrompe um download já aberto.

A fixture persistente passou no diretório de trabalho. A pasta temporária isolada do sistema recusou rename; o teste foi movido para seu próprio diretório de trabalho autorizado e limpo após o uso, sem alterar o mecanismo de gravação do produto.

## Navegador

API e acervo exclusivamente fictícios. Conferidos: login administrativo, painel, cadastro de conta, seleção de subpasta na árvore, permissão de download e login da conta comum mostrando somente sua pasta e sem botão de administração. Gestão de usuários conferida em larguras de 1280 e 390 pixels, sem rolagem horizontal. Conferidos também árvore por nível, segunda página de pastas, conteúdo direto, pesquisa recursiva e layout responsivo.

## Limites de homologação

Não houve acesso ao Everything ou acervo real da instalação do usuário. É necessário homologar Everything 1.4.1, leitura NTFS/SMB, mapeamentos UNC e firewall no host de operação. O modo HTTPS usa o servidor TLS padrão do Node; certificado, cadeia, confiança dos clientes e acesso por outros PCs devem ser verificados na LAN real. Os testes de configuração não comprovam essa implantação.

O pacote de atualização não inclui .env, data/, contas, certificados/chaves, caminhos reais ou arquivos do acervo. Não foram modificados inventário, checkpoints, Onyx, Everything, firewall ou serviços existentes.

## Troca da própria senha

Testadas senha atual incorreta, confirmação divergente, senha curta, troca de conta comum sem afetar admin, encerramento de todas as sessões, troca administrativa persistente, recusa da credencial antiga e preservação do hash administrativo ao editar outras contas. Nenhuma senha real foi usada. A tela de troca foi conferida no navegador sem alterar credenciais reais.

## Assistente HTTPS

Testada conexão TLS real com validação normal: cliente sem a autoridade local é recusado; cliente com a autoridade e nome corretos é aceito. Testadas assinatura, nome incorreto, preservação de .env/contas/downloads, backup, tratamento de chaves duplicadas e reutilização sem regenerar certificados válidos. Proteção NTFS via icacls, importação no repositório de certificados do Windows, firewall e confiança nos navegadores da equipe exigem homologação no host; o teste de arquivos usa um protetor de diretório simulado. Nenhuma chave ou certificado gerado foi incluído na entrega.
