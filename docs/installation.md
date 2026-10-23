# Diário de instalação — Onyx Standard

Registro sanitizado da implantação em **23/10/2026**. Não é um instalador automático nem um procedimento validado para produção.

## Ambiente

- Windows 11, Ubuntu WSL2, Docker Desktop com integração à distribuição Ubuntu.
- CPU Intel i5-10400F (6 núcleos/12 threads), aproximadamente 16 GB RAM, GTX 1650 (4 GB VRAM), disco com espaço livre suficiente.
- Docker CLI 29.9.2 e Compose v5.6.1.
- Ollama **no Windows**, Onyx **em contêineres Docker**. Host de processamento separado do servidor que guarda os documentos.

## Implantação observada

1. WSL2/Ubuntu inicializado; usuário Linux configurado.
2. Docker Desktop instalado e integração WSL ativada.
3. Erro inicial de permissão ao acessar socket resolvido adicionando o usuário Linux ao grupo `docker` e abrindo **nova sessão**.
4. `docker run --rm hello-world` concluiu.
5. Instalador Onyx **v1.4.4**, modo **Standard**, imagens/serviços **v4.9.4**.
6. Instalador confirmou `Onyx is ready` e interface em `http://localhost:3000`.
7. Conta administrativa criada no primeiro cadastro; agente e modelos configurados posteriormente.

Instalador oficial (revisar antes de executar):

```bash
curl -fsSL https://onyx.app/install_onyx.sh -o /tmp/install_onyx.sh
less /tmp/install_onyx.sh
bash /tmp/install_onyx.sh
```

Configuração gerada sob `$HOME/.config/onyx`: **nunca versionar os arquivos reais de configuração e segredos**.

## Ollama — configuração funcional

A URL vista a partir do Docker usa `host.docker.internal`, não `localhost`:

- API nativa: `http://host.docker.internal:11434`
- API OpenAI-compatible: `http://host.docker.internal:11434/v1`

Teste HTTP a partir do próprio contêiner de API foi bem-sucedido (`GET /api/tags` retornou **200**). Testes de geração direta e streaming também funcionaram.

O provedor **Ollama nativo** do Onyx passou no cadastro após uma alteração temporária, mas o **chat falhou**. A integração que permitiu conversar foi **OpenAI-Compatible** apontando para `/v1`, usando `qwen3:1.7b`. Uma chave local fictícia foi utilizada como requisito de compatibilidade no formulário; não se deve usar credenciais reais em documentação.

`gemma3:1b` foi rejeitado nesse fluxo de chat devido a ausência de suporte a ferramentas informado na validação. `qwen3.5:4b` foi baixado para benchmark, sem conclusão de superioridade ou latência.

## Importante: correção temporária

No código embarcado do Onyx v4.9.4 foi observado `LLM_PROBE_TIMEOUT_S = 10` em `/app/onyx/llm/utils.py`. O Gemma demorou **15,38 s** em teste direto, enquanto a validação expirava após cerca de **10 s**.

Foi feita **alteração manual dentro do contêiner** para `60` segundos e reinício da API. Isso permitiu o cadastro do provedor nativo, **mas não corrigiu o chat**. A mudança **não é persistente** se o contêiner for recriado; não deve ser apresentada como solução definitiva.

A configuração de chat tem um limite padrão separado `LLM_SOCKET_READ_TIMEOUT = 60` (variável de ambiente), e os logs de busca apontaram timeouts de geração auxiliares. **Não aumentar esse valor indiscriminadamente**.

Veja [diagnóstico e caminho funcional](onyx-ollama-troubleshooting.md).

## Estado atual

Onyx acessível e agente respondendo com documentos de teste; desempenho de buscas complexas ou com mais chamadas à IA requer otimização. Ainda **não** há servidor de arquivos conectado, controle de ACL homologado, OCR em produção nem teste com dez sessões simultâneas.
