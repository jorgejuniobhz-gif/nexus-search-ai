# Arquitetura do Nexus Search AI

## Objetivo

Disponibilizar busca por conteúdo e consultas em linguagem natural a documentos autorizados, por navegador, em pequena equipe. O projeto complementa — **não substitui** — a organização gradual do acervo de origem.

## Ambientes separados

```text
Servidor de documentos (Windows Server)
     |   compartilhamento SMB (futuro: somente leitura)
     v
Computador de processamento (Windows 11)
     |-- Ubuntu WSL2 + Docker Desktop
     |     |-- Onyx Standard v4.9.4
     |     |-- índice / base de dados / serviços internos
     |     '-- agente Nexus + recuperação de fontes
     '-- Ollama local -> Qwen3 1.7B (modelo funcional)

Navegador local -> Onyx -> busca e respostas fundamentadas
```

**Estado atual:** documentos sintéticos inseridos pelo conector File. **Nenhum compartilhamento SMB real integrado**.

## Pipeline documental pretendido

Fonte aprovada e somente leitura -> extração de texto (PDF nativo, DOCX, etc.) -> OCR opcional em digitalizações -> indexação -> consulta semântica/por palavra-chave -> resposta com referência ao documento.

O índice e suas citações podem conter trechos sensíveis: proteger o processamento, o armazenamento e o acesso ao navegador. Sem homologação de segurança, limitar os dados a um conjunto comum e não confidencial.

## Modelo e fluxo

- LLM local: Ollama no Windows, acessado pelo Docker via `host.docker.internal`.
- Integração de chat bem-sucedida: provedor **OpenAI-Compatible**, URL local `/v1`, Qwen3 1.7B.
- Agente: **Nexus — Pesquisa Documental**, instruções de idioma, fontes, concisão e não invenção.
- Busca: Onyx Standard com índice interno e ferramentas de pesquisa.
- A qualidade do agente depende de recuperação e de chamadas auxiliares de IA. Um documento pequeno ainda pode disparar múltiplas etapas e timeouts.

## Limites operacionais observados

- Computador: ~16 GB RAM, GPU com 4 GB de VRAM.
- Docker/WSL2: limite observado próximo de **7,68 GiB**.
- A medição instantânea mostrou OpenSearch ~2,63 GiB, background ~1,33 GiB e outros serviços relevantes; o total dos contêineres aproximou-se do limite.
- Ollama no Windows usa recursos **fora** da medição dos contêineres.
- Uma busca complexa com apenas dois arquivos mostrou `Thought for 8m16s`, com erros de timeout em chamadas auxiliares. Em outra busca com Qwen3 1.7B, `Thought for 40s`, resultado correto. **Thinking não é latência total.**

## Segurança e implantação progressiva

1. Fontes fictícias na prova de conceito.
2. Pasta-piloto autorizada, somente leitura.
3. Pesquisa interna e citações verificadas independentemente.
4. Testes de controle de acesso com usuários de permissões distintas.
5. Expansão gradual do índice; não ingerir o acervo completo de uma vez.
6. Hospedagem e acesso na rede apenas após autenticação e endurecimento.

Não assumir suporte automático a permissões SMB/NTFS por usuário. Recursos podem variar por edição e conector.
