# Roadmap — Nexus Search AI

## Fase 1 — Prova de conceito local

- [x] Ubuntu WSL2 instalado
- [x] Docker Desktop e Compose validados
- [x] Onyx Standard v4.9.4 inicializado e interface web acessível
- [x] Ollama local e conexão OpenAI-Compatible
- [x] Agente Nexus com instruções de pesquisa documental
- [x] Conector File com dois arquivos fictícios
- [x] Recuperação do documento e resposta com indicação de fonte
- [ ] Benchmark reproduzível de latência total (busca, modelo e resposta)
- [ ] Teste de informação inexistente e manejo de incerteza
- [ ] Confirmar configuração persistente, recuperação e backup

## Fase 2 — Desempenho

- [ ] Medir consulta direta ao índice, sem agente
- [ ] Registrar latência e taxa de acerto com 2, 10, 100 e 1.000 arquivos sintéticos
- [ ] Aferir limites de memória do Docker/WSL2 e uso de GPU/CPU do Ollama
- [ ] Reduzir chamadas auxiliares e avaliar desativação de thinking em buscas objetivas
- [ ] Comparar `qwen3:1.7b` e `qwen3.5:4b` no mesmo conjunto de perguntas
- [ ] Monitorar erros em filtros de data, seleção de documentos/contexto e streaming
- [ ] Avaliar resultados sob uso simultâneo controlado

## Fase 3 — OCR e formatos

- [ ] Testar PDF digital, PDF escaneado, DOCX, XLSX e imagens
- [ ] Extrair texto nativo quando existir; aplicar OCR apenas quando necessário
- [ ] Avaliar Tesseract e outras alternativas em documentos autorizados
- [ ] Medir qualidade do reconhecimento e citar origem/página quando disponível
- [ ] Não modificar arquivos originais

## Fase 4 — Rede e acesso (pequena equipe)

- [ ] Definir uma pasta-piloto aprovada para todos os participantes
- [ ] Selecionar ingestão SMB somente leitura, com controle de credenciais
- [ ] Testar criação, alteração e exclusão de arquivos e efeitos na indexação
- [ ] Validar autenticação e segregação por usuário; não assumir herança de ACLs
- [ ] Revisar exposição de portas, políticas de backup e atualizações
- [ ] Testar aproximadamente dez usuários, inclusive buscas concorrentes

## Fase 5 — Evolução

- [ ] Expandir gradualmente o escopo documental, com governança
- [ ] Coletar feedback sobre resultados e latência sem registrar conteúdo sensível
- [ ] Documentar decisões de modelos, versões, conectores e retenção
- [ ] Avaliar publicação do repositório somente após auditoria de segurança
