# Nexus Search AI

**Busca inteligente de documentos locais, com OCR, IA e referências às fontes.**

Projeto de laboratório para disponibilizar pesquisa de documentos por navegador, utilizando uma implantação independente do [Onyx](https://github.com/onyx-dot-app/onyx) (edição Standard). O objetivo é extrair e indexar conteúdo de arquivos previamente autorizados, permitir buscas por palavras-chave e significado, e futuramente responder perguntas com citações dos arquivos de origem.

> **Estado: implantação em andamento.** O Docker foi validado; o download das imagens Onyx Standard v4.9.4 foi iniciado. **Ainda não foi confirmada a inicialização da interface nem a indexação de documentos.**

## Arquitetura inicial

```text
Documentos autorizados (somente leitura)
          |
          v
Extração de texto -> OCR opcional
          |
          v
    Índice Onyx Standard
          |
          v
 Interface Web + busca + respostas citadas
```

A primeira execução usa **documentos sintéticos** e acesso local. Fontes de rede, autenticação de equipes e permissões por documento exigem homologação independente. Nenhum arquivo original deve ser alterado ou enviado a provedores externos sem uma decisão explícita sobre fluxo de dados.

## Status do laboratório

| Item | Estado |
| --- | --- |
| Ubuntu no WSL2 | Validado |
| Docker Desktop e integração WSL | Validado |
| Docker Compose | Validado |
| Onyx Standard v4.9.4 | Download iniciado; execução ainda não verificada |
| Interface pelo navegador | Pendente |
| Primeiro conjunto de documentos indexados | Pendente |
| OCR | Planejado |
| IA local | Planejada, sujeita a benchmark de recursos |

## Documentação

- [Arquitetura e fronteiras de segurança](docs/architecture.md)
- [Instalação e diário técnico](docs/installation.md)
- [Plano de entregas](docs/roadmap.md)
- [Segurança e privacidade](docs/security.md)
- [Configuração de exemplo](config/.env.example)

## Escopo e princípios

- Buscar arquivos por conteúdo e, quando viável, por semântica.
- Exibir referência e origem dos documentos utilizados nas respostas.
- Priorizar extração nativa de PDFs antes de recorrer a OCR.
- Usar fontes explicitamente autorizadas e preferencialmente montadas somente para leitura.
- Evitar serviços externos para dados confidenciais; validar o caminho de informações antes de ligar modelos e conectores.
- Preservar rastreabilidade, reversibilidade e não alteração dos originais.

## Desenvolvimento e instalação

Este repositório **não é um fork do Onyx** nem reproduz seu código. Para uma primeira implantação consulte a [documentação oficial](https://docs.onyx.app/deployment/overview) e [nosso diário de instalação](docs/installation.md). Versões e requisitos devem ser conferidos antes de executar scripts em ambientes novos.

## Publicação e contribuições

A documentação não deve incluir endereços de rede privados, caminhos reais de compartilhamentos, nomes de pessoas, documentos, credenciais nem logs confidenciais. Antes de tornar este repositório público, revise todo o histórico de commits, issues e anexos.

## Créditos

Baseado no software independente [Onyx](https://github.com/onyx-dot-app/onyx), sujeito às licenças e condições aplicáveis do projeto original.
