# Validação da entrega — 26/10/2026

Node.js 24.21.0 em Windows. Sete testes automatizados aprovados, nenhum ignorado:

1. Configuração bloqueia bind LAN, modo multiusuário, upstream arbitrário e ausência de segredo.
2. Contenção Windows rejeita diretórios com prefixo parecido, travessia, dispositivos, streams alternativos e caminhos malformados.
3. Query fixa upstream, escapa operadores, restringe raízes e limita paginação.
4. Resultados passam por allowlist e recebem UNC pelo mapeamento configurado.
5. HTTP exige sessão/origem; recusa proxy, IDs inventados, falha upstream e resultados fora do escopo. Download negado após checagem inicial é bloqueado.
6. Streaming de download usa ID emitido pelo backend e verifica acesso novamente.
7. Leitura real de arquivo sintético no Windows funciona; diretório, arquivo ausente, caminho fora de escopo e junction são recusados.

Sintaxe do JavaScript do navegador e do configurador verificada. Interface aberta no navegador com dados exclusivamente fictícios; login, resultados, migalhas, navegação, estado vazio e logout verificados. A prévia usa API simulada e não é servidor de produção.

O isolamento inicial impediu conexões HTTP dos testes (`EACCES`); os testes foram repetidos com permissão de conexão local e passaram. Nenhuma proteção do produto foi removida para isso.

## Pendente na instalação real

Everything não respondeu em `127.0.0.1:8888` no ambiente da entrega. Compatibilidade com a instância real 1.4.1, contagens, permissões NTFS/SMB, mapeamentos UNC, firewall e abertura pelo Explorador precisam da homologação documentada no README. Não há validação de identidades AD ou de grupos, portanto acesso da equipe pela LAN permanece bloqueado.

Não foram alterados inventário, checkpoints, Onyx, configurações do Everything, firewall ou serviços existentes. Nenhum arquivo do acervo foi utilizado nos testes.
