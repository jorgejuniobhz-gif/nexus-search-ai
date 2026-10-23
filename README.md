# Nexus Search AI

**Busca inteligente de documentos locais, com IA, recuperação de fontes e OCR planejado.**

Laboratório independente baseado em [Onyx Standard](https://github.com/onyx-dot-app/onyx), executado em Docker Desktop + Ubuntu WSL2, com modelos locais servidos pelo Ollama.

> **Status em 23/10/2026: prova de conceito de busca documental funcional.** O agente consultou dois documentos sintéticos, recuperou informações corretas e apresentou os nomes dos arquivos-fonte. O desempenho ainda é instável; OCR, integração com compartilhamentos de rede e acesso multiusuário **não estão homologados**.

## Arquitetura resumida

```text
Arquivos aprovados -> Conector de ingestão -> Índice Onyx Standard
                                                |
Navegador -> Agente Nexus -> Busca interna/RAG -> Ollama local
                                                |
                                     Resposta com fonte
```

A aplicação roda em um computador de processamento **separado** do servidor de arquivos. O servidor de origem não requer instalação de Onyx e não deve ser alterado. A ingestão futura da rede precisa ser validada **somente leitura**.

## Marcos validados

- [x] Ubuntu no WSL2 e Docker Desktop integrados
- [x] Onyx Standard v4.9.4 inicializado e interface disponível no navegador
- [x] Ollama local, com `qwen3:1.7b`, `gemma3:1b` e `qwen3.5:4b` baixados
- [x] Conexão **OpenAI-Compatible** do Onyx ao Ollama validada com Qwen3 1.7B
- [x] Agente **Nexus — Pesquisa Documental** criado e testado em português
- [x] Conector de arquivos com dois documentos **sintéticos** indexados
- [x] Respostas corretas com referência aos arquivos de teste
- [ ] Otimizar busca e chamadas auxiliares de IA (timeout de até vários minutos observado)
- [ ] OCR de PDFs digitalizados e imagens
- [ ] Ingestão somente leitura de um compartilhamento de rede
- [ ] Controle de acesso validado para usuários diferentes
- [ ] Configuração durável e monitoramento operacional

## Documentação

- [Arquitetura](docs/architecture.md)
- [Instalação e diário técnico](docs/installation.md)
- [Integração Onyx + Ollama e incidentes](docs/onyx-ollama-troubleshooting.md)
- [Piloto documental e resultados](docs/pilot-results.md)
- [Plano de evolução](docs/roadmap.md)
- [Segurança e privacidade](docs/security.md)

## Limites e princípios

- **Busca com fonte:** resposta correta sem nova recuperação não comprova pesquisa.
- **Desempenho:** distinguir tempo de thinking, tempo da busca e latência total.
- **Privacidade:** processar dados aprovados localmente, sem publicar conteúdo ou logs reais.
- **Acesso:** não presumir que um índice compartilhado respeita automaticamente ACLs SMB/NTFS.
- **Manutenção:** alterações dentro de contêineres são temporárias e podem sumir ao recriá-los.

Este repositório documenta implantação, testes e decisões: **não é um fork do Onyx**. Consulte a [documentação oficial](https://docs.onyx.app/deployment/overview) para instruções atualizadas e licenças aplicáveis.

## Publicação

O projeto permanece privado durante o laboratório. Antes de publicá-lo, auditar histórico de commits, documentação, issues e anexos para evitar credenciais, identificadores, caminhos internos ou arquivos de terceiros.
