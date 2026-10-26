# Nexus Search AI Web 1.0

Aplicação funcional de pesquisa de nomes e caminhos via Everything 1.4.1 HTTP JSON. Backend Node.js 24+, interface responsiva em português, sem dependências npm externas e sem envio a modelos de IA. Esta pasta é independente dos inventários, checkpoints e Onyx existentes.

## Estado de acesso

**Versão inicial: apenas administrador local.** Não há integração AD/Windows verificável neste ambiente. Por isso, a aplicação recusa qualquer modo multiusuário, bind diferente de `127.0.0.1`, upstream remoto e cabeçalhos de proxy. A senha identifica o administrador desta instalação; não representa usuários Windows diferentes. As raízes configuradas são a autorização explícita desse administrador. Nomes e caminhos só são retornados depois da autenticação e da restrição de escopo no backend.

Nenhuma implantação pública ou acesso da equipe pela LAN está habilitado nesta versão. Não use túnel, port forwarding, proxy reverso ou compartilhamento de senha para contornar isso. O uso remoto só poderá ser liberado após implementar e validar identidade e autorização individual descritas em `DEPLOYMENT.md`.

## Executar no PC da Beatriz

Execute no **Windows que roda o Everything**, com a conta Windows que tem acesso às raízes aprovadas. Não é necessário WSL/Ubuntu. Se o PC da Beatriz for outro computador, a instalação deve ocorrer no host de processamento; não troque o upstream por um IP da LAN.

1. Instale Node.js 24 LTS ou superior de [nodejs.org](https://nodejs.org/). Extraia esta pasta para um diretório próprio. Não coloque dentro de inventários, checkpoints ou do Onyx.
2. Em Everything → Ferramentas → Opções → Servidor HTTP, mantenha a porta `8888` e **Bind to interfaces = `127.0.0.1`**. Desmarque **Allow file download**. Não crie regra de entrada para a porta 8888. O Nexus não depende do download HTTP do Everything. Referência: [documentação oficial do Everything](https://www.voidtools.com/support/everything/http/).
3. Abra PowerShell nesta pasta e execute:

   ```powershell
   npm run setup
   ```

   Informe uma raiz explicitamente aprovada para esse administrador. Opcionalmente informe o UNC correspondente, para que um caminho de disco local seja convertido corretamente para compartilhamento. Não suponha que uma unidade mapeada representa o mesmo caminho em outro PC. A ferramenta gera uma senha aleatória, exibe-a uma vez e cria `.env` sem sobrescrever configuração existente. Guarde a senha em local seguro.
4. Execute:

   ```powershell
   npm test
   npm start
   ```

5. Acesse **http://127.0.0.1:3000** no mesmo computador e entre com a senha gerada. O endereço usa `127.0.0.1`, não `localhost`, para validar Host e origem. Pesquise primeiro um arquivo de teste não confidencial cuja presença já é conhecida.
6. Encerre com Ctrl+C. Sessões expiram após 30 minutos e são descartadas ao reiniciar. O acesso ao `.env` e à pasta deve ficar restrito ao administrador via permissões NTFS. Não execute o processo com privilégios elevados desnecessários.

## Configuração local por ambiente

| Variável | Uso |
| --- | --- |
| `NEXUS_MODE` | Somente `admin-local`; outro valor impede inicialização. |
| `NEXUS_HOST` | Somente `127.0.0.1`. |
| `NEXUS_PORT` | Porta web, padrão 3000; não pode ser 8888. |
| `EVERYTHING_URL` | Fixa em `http://127.0.0.1:8888/`. |
| `NEXUS_ADMIN_HASH` | Salt e scrypt gerados localmente; nunca publicar. |
| `NEXUS_ROOTS` | Array JSON com 1–20 objetos `{ "path": "…", "unc": "…" }`; `unc` opcional. Configure apenas raízes aprovadas. |
| `NEXUS_DOWNLOADS` | `false` por padrão. Somente `true` habilita a ação de verificar download. |

Edite `.env` localmente e reinicie para aplicar mudanças. Use aspas simples externas para preservar as barras do JSON. O exemplo contém apenas nomes fictícios. Não envie `.env`, senhas, caminhos reais, resultados ou arquivos ao GitHub.

## Recursos e limites

- Busca literal em nomes e caminhos com debounce de 350 ms, cancelamento de requisições antigas, filtros por categoria, extensão e arquivo/pasta, páginas de 25/50/100 e contagem do Everything dentro do escopo.
- A extensão digitada prevalece sobre a categoria. Não oferece sintaxe avançada Everything; aspas e controles são recusados para impedir injeção de expressão. `foo bar` é uma sequência literal. Pastas são navegadas por subárvore, não apenas filhos imediatos.
- Migalhas derivadas do caminho permitem pesquisar dentro das pastas. O botão “Todas as raízes” volta ao escopo inicial. O backend impede navegar para fora das raízes.
- Copiar UNC exige caminho UNC original ou mapeamento explícito. “Abrir no Windows” copia o caminho para colar no Explorador: navegadores normalmente bloqueiam abrir programas e arquivos locais. Nenhum executável é iniciado pelo servidor. O Windows verifica o acesso ao abrir pelo Explorador.
- Download usa arquivos locais/SMB pelo backend, jamais o endpoint de download Everything. Exige sessão, ID aleatório de resultado emitido para essa sessão, raiz aprovada, leitura possível pela conta Windows do processo, arquivo regular e recusa de links simbólicos/junctions. A checagem é repetida ao baixar. Nomes não autorizados ou caminhos arbitrários não podem ser requisitados diretamente.
- As raízes e seus diretórios ancestrais precisam ser administrados por pessoas confiáveis. Não há defesa contra um administrador local malicioso ou substituições de diretórios concorrentes por quem controla o filesystem. Não use essa implementação como autorização multiusuário ou isolamento contra usuários locais hostis.
- Mudança/remoção de arquivos após indexação pode causar falha ao baixar. A busca não abre todos os arquivos para checar leitura; o administrador autorizou a visibilidade dos metadados nas raízes. ACLs da conta do processo só são usadas na leitura, por isso esse desenho não serve para equipe.
- Não há histórico persistente, telemetria, cache compartilhado ou logs de termos/caminhos. Limite de 5 tentativas de login/minuto, 3 buscas simultâneas, timeout de 8 s e resposta upstream limitada a 2 MB.

## Verificação no host real

Use um arquivo e uma pasta sintéticos na raiz aprovada. Confirme busca, contagem, extensão, paginação, migalhas e cópia de UNC. Habilite downloads somente após testar: arquivo legível baixa; arquivo sem leitura na conta do processo falha; pasta e ID inventado falham; caminho fora da raiz não aparece. Confirme que o Everything real retorna `totalResults` inteiro e `results` com `type`, `name`, `path` e `size`; formato inesperado resulta em erro seguro.

Confira listeners sem alterar serviços:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8888,3000 | Select-Object LocalAddress,LocalPort
```

Ambas as portas devem estar em `127.0.0.1`. De outro PC, `Test-NetConnection <host-de-processamento> -Port 8888` e porta 3000 devem falhar nesta versão. Isso precisa ser verificado na máquina de destino; os testes simulados não comprovam firewall, ACL ou conectividade real.

## Solução de problemas

“Everything indisponível”: confirme o serviço e `http://127.0.0.1:8888/?search=teste&json=1` no host; a API deve responder JSON sem redirecionamento. Se Everything exige Basic Auth, esta versão não envia credenciais upstream: mantenha-o somente em loopback e avalie a política local antes de alterar autenticação. Nunca coloque segredo na URL.

“Resposta fora do escopo”: o backend descartou a página inteira, inclusive a contagem. Confirme caminho/raiz e compatibilidade do Everything, sem alargar o escopo para resolver o erro. “Download sem acesso”: confirme leitura na conta que executa Node e ausência de junctions/symlinks. UNC ausente: configure o mapeamento real apenas no `.env` local.

Testes: `npm test` usa API simulada e arquivos sintéticos, sem indexar nem ler dados do usuário. Testa configuração restritiva, injeção, travessia, sessão, origem, escopo, falha upstream, download e rechecagem. A homologação Windows/Everything/ACL continua necessária antes do uso com dados reais.
