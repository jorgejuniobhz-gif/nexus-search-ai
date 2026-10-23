# Piloto de pesquisa documental — 23/10/2026

## Escopo

Busca em **dois arquivos TXT totalmente fictícios**, enviados ao mesmo conector **File** e utilizados pelo agente **Nexus — Pesquisa Documental**.

Nenhum documento do servidor de arquivos real foi conectado até este marco. Conteúdos abaixo são apenas valores de teste, não dados operacionais.

## Casos validados

| Teste | Fonte | Resultado esperado | Resultado observado |
| --- | --- | --- | --- |
| Código do projeto fictício Vila Aurora | `teste-nexus.txt` | `NX-8472` | Correto; fonte identificada |
| Responsável e data de início de Vila Aurora | `teste-nexus.txt` | `Marina Oliveira`, `15/09/2026` | Correto; fonte apresentada |
| Total de documentos do projeto fictício Horizonte | `teste-nexus-02.txt` | `347` | Correto; execução de busca e leitura da fonte observada |

A recuperação independente foi mais evidente no teste **Horizonte**, pois o registro mostrou `Searching internal documents` e `Reading teste-nexus-02.txt`. Em respostas anteriores houve indicação de reutilização de contexto/histórico, portanto não é correto tratar cada acerto como prova de uma nova busca.

## Comportamento observado

- Agente personalizado respondeu corretamente em português em testes básicos e citou fontes.
- Algumas respostas saíram em inglês ou extrapolaram o formato solicitado; instruções ajudam, mas não substituem testes.
- `qwen3:1.7b` funcionou no chat com integração **OpenAI-Compatible**; `qwen3.5:4b` está disponível para comparação, **sem aprovação de desempenho**.
- Um teste exibiu `Thought for 8m16s` e reportou timeout de `internal_search` seguido de nova tentativa.
- No segundo arquivo, `Thought for 40s`, com resultado correto e busca interna visível.
- Respostas rápidas sem busca claramente identificável **não validam indexação nem ganho de latência de busca**.

## Diagnóstico técnico de desempenho

Instantâneo dos contêineres, com limite compartilhado do Docker próximo de **7,68 GiB**:

| Serviço | Memória aproximada |
| --- | ---: |
| OpenSearch | 2,63 GiB |
| Processamento em background | 1,33 GiB |
| Servidor de inferência | 0,72 GiB |
| API | 0,52 GiB |
| Modelo de indexação | 0,40 GiB |

Os demais serviços também ocupam memória. Esses números são **um snapshot**, não medições de pico. Ollama executa no Windows e não aparece em `docker stats`. Ainda não se confirmou saturação como causa única.

Logs sanitizados indicaram:
- `LLM streaming call exceeded its total timeout` durante busca interna.
- `httpx.ReadTimeout` e `litellm.Timeout` em decisões auxiliares.
- Falhas em `document selection`, `context selection` e `time filter`.
- Falha de geração de nome de conversa por timeout.

## Critérios para próximo marco

- Fazer novas perguntas sobre dados inéditos em sessões novas.
- Medir tempo total e p50/p95 por tipo de consulta (incluindo buscas sem resposta).
- Testar presença e ausência de fontes e citações corretas.
- Comparar desempenho com e sem IA sobre os mesmos arquivos.
- Rodar casos com 10, 100 e 1.000 documentos *sintéticos* antes de conectar acervos reais.
- Verificar permissões de acesso e não divulgação antes de piloto com mais usuários.

**Resultado geral:** prova de conceito funcional, mas **não pronta para produção** por latência e controles de acesso ainda não homologados.
