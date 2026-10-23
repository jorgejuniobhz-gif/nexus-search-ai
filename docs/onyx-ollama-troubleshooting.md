# Onyx + Ollama: diagnóstico e solução de integração

Registro técnico **sanitizado**, referente à instalação de laboratório em 23/10/2026. Não inclui segredos, identificadores de usuário, IPs internos da organização ou logs brutos.

## Sintoma inicial — falha ao cadastrar LLM

Na configuração nativa `Ollama` (`ollama_chat`), o botão **Connect** retornava:

```text
POST /api/admin/llm/test -> HTTP 400
VALIDATION_ERROR: API connection error
```

## O que foi comprovado

- `GET http://localhost:11434/api/tags` no Windows: **HTTP 200**, com modelo instalado.
- `GET http://host.docker.internal:11434/api/tags` de dentro de um contêiner: **HTTP 200**.
- Mesmo GET dentro do contêiner da API do Onyx: **HTTP 200**.
- Geração de resposta por `/v1/chat/completions` a partir da API do Onyx: **HTTP 200**.
- Chamada direta de streaming pelo LiteLLM funcionou (Gemma: **3,73 s**).
- `litellm.completion(..., base_url=...)` e `api_base=...` funcionaram.
- O singleton LiteLLM do próprio Onyx também respondeu ao teste simples (**0,27 s**, uma execução).
- Portanto, o erro de cadastro/chat **não era uma indisponibilidade geral da API Ollama**.

## Por que o cadastro nativo demorava

Os logs da API mostraram:

```text
litellm.Timeout: Connection timed out after ~10 seconds
```

Código observado no Onyx Standard v4.9.4:

```python
# /app/onyx/llm/utils.py
LLM_PROBE_TIMEOUT_S = 10

def test_llm(llm, total_timeout_s=LLM_PROBE_TIMEOUT_S):
    ...
```

Um teste direto do Gemma retornou corretamente, mas levou **15,38 s**, superando o limite de validação. O código tentava duas vezes.

**Workaround temporário realizado:** substituição manual de `LLM_PROBE_TIMEOUT_S = 10` por `60` **dentro do contêiner** `onyx-api_server-1` e reinício da API. O cadastro de modelo foi aceito depois dessa alteração.

**Limitações:** a alteração não sobrevive necessariamente à recriação/upgrade do contêiner e **não solucionou o chat**. Não usar como patch de produção sem revisão, testes e estratégia de persistência. O backup temporário também está no filesystem do contêiner.

## Por que o chat nativo ainda falhava

Na interface, o chat com `ollama_chat/gemma3:1b` devolvia `CONNECTION_ERROR`. Logs mostram:

```text
Retrying pre-chunk stream ... after APIConnectionError
```

O código de chat usa streaming, `LLM_SOCKET_READ_TIMEOUT` padrão de **60 s**, cliente HTTP e opções próprias. O streaming *direto* LiteLLM funcionava; o caminho completo de chat nativo falhava. **A causa detalhada do erro do provedor nativo não foi isolada conclusivamente**.

## Caminho funcional — OpenAI-Compatible

Foi criado um **segundo provedor**, usando o formulário dedicado **OpenAI-Compatible**, com:

| Campo | Valor de laboratório |
| --- | --- |
| API Base URL | `http://host.docker.internal:11434/v1` |
| API Key | Valor fictício local, se exigido pelo formulário |
| Display Name | `Ollama Local API` |
| Modelo funcional | `qwen3:1.7b` |

`gemma3:1b` falhou no chat pelo novo provedor com mensagem explícita de que **não suporta ferramentas** no fluxo utilizado. O `qwen3:1.7b` respondeu com sucesso, demonstrando suporte ao caminho agentic/tools.

**Não apontar esse endpoint para uma instância pública**. Uma chave fictícia só é apropriada para a API local sem autenticação, não para provedores externos.

## Thinking e latência

- Qwen3 1.7B no endpoint OpenAI-compatible com `max_tokens=80` respondeu com `content` vazio e `reasoning` preenchido: esgotamento de tokens em raciocínio no teste.
- Repetindo com `reasoning_effort: none`, `max_tokens=100`: conteúdo `OK`, `finish_reason: stop`.
- Na pesquisa documental agentic foram observados valores de `Thought for 56s`, `8m16s`, `40s`, além de casos com `1s`. **Não confundir esse indicador com latência total de ponta a ponta**.
- Logs confirmaram timeouts em seleção de documentos, seleção de contexto, decisão de filtro de data e geração auxiliar da busca interna. Algumas chamadas foram repetidas.
- Isso indica gargalo em **chamadas auxiliares do pipeline RAG/agentic**, não que o índice leve minutos para recuperar um TXT. Ainda falta medir isoladamente o tempo de busca.

## Incidentes secundários

Os logs de tarefas de fundo registraram erro em `cleanup_idle_sandboxes` por ausência de configuração válida de Kubernetes. Não há evidência suficiente de que isso explique a lentidão da pesquisa; acompanhar separadamente.

Uma mensagem `WSL UtilAcceptVsock ... accept4 failed 110` surgiu ao tentar abrir programa Windows pelo WSL. O TXT de diagnóstico foi gerado apesar disso.

## Próximos passos de engenharia

1. Medir separadamente: consulta direta ao índice, tempo de primeiro token, chamadas de ferramentas, tempo total.
2. Reproduzir a lentidão em uma sessão nova com perguntas inéditas e logs correlacionados.
3. Testar a desativação de thinking em perguntas objetivas, sem prejudicar suporte a tools.
4. Validar desempenho de `qwen3:1.7b` contra `qwen3.5:4b` sob mesma carga.
5. Substituir qualquer workaround manual por configuração suportada ou alteração versionada e reversível, **se ainda for necessária**.
6. Evitar ampliar timeouts sem eliminar a causa do congestionamento.
