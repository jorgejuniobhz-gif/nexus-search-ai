# Segurança e privacidade

## Acesso no servidor

Toda pesquisa autenticada usa concessões de pastas calculadas no backend, intersectadas com as raízes globais. Contas sem concessões retornam zero sem consultar o índice. Respostas upstream fora do escopo são rejeitadas integralmente. O painel de usuários exige a identidade administrativa.

Senhas são armazenadas com scrypt e salt aleatório. A sessão usa identificador aleatório em cookie HttpOnly e SameSite=Strict, com Secure no HTTPS; expira em 30 minutos. Há validação de Host/origem e limites de tentativas de login. Mudanças de conta, senha ou permissões revogam sessões; downloads abertos são interrompidos e buscas com versão antiga são descartadas.

## Rede

A equipe acessa o backend por HTTPS, restrito à LAN aprovada. A configuração padrão é loopback local. Acesso LAN pelo modo accounts exige certificado, chave e origem HTTPS exata. A porta 8888 é exclusiva do Everything local em 127.0.0.1, sem entrada da LAN, proxy genérico ou downloads HTTP por essa API. Não publique o serviço na internet como parte deste procedimento.

## Autorizações e arquivos

As contas Nexus têm concessões próprias, sem identidade Windows/AD individual. O processo usa sua conta Windows para ler o disco/SMB após validar a conta da aplicação. O painel não muda ACLs do servidor. Acesso direto pelo Explorador permanece sujeito ao compartilhamento; uma concessão no Nexus não restringe esse acesso externo.

Download exige opção global, permissão individual, ID ligado à sessão, caminho permitido e nova leitura autorizada. O backend rejeita arquivos não regulares e verifica contenção/links. Quem administra as raízes e ancestrais deve ser confiável; o modelo não oferece isolamento contra administrador local malicioso ou substituição concorrente por quem controla o filesystem. A checagem pelo cliente SMB não substitui a segurança do servidor de arquivos.

Expor nomes/caminhos já pode revelar informação confidencial. Conceder somente as pastas aprovadas, mesmo quando o download estiver desabilitado. A pesquisa é de metadados; nenhum conteúdo é enviado a serviço externo para gerar respostas.

## O que fica fora do GitHub

- .env real, seus backups e hashes/senhas/tokens reais.
- data/users.json, outras bases de contas, snapshots e backups locais.
- Chaves privadas, incluindo server-key.pem, pacotes com chave e credenciais Windows.
- Documentos do acervo, índices, logs de consultas e capturas com conteúdo real.
- Nomes institucionais, endereços internos, caminhos operacionais, e-mails e identificadores pessoais da instalação.

O arquivo .env.example usa somente valores fictícios ou loopback. Exemplos não concedem acesso a uma origem real.

## Certificado público

O nexus-ca.cer contém o certificado público da autoridade, não sua chave privada. Sua distribuição foi autorizada para facilitar a confiança nos clientes do repositório privado. Antes de anexar, conferir que é somente certificado, sua impressão SHA-256, validade e campos públicos, removendo qualquer material privado do envio. O arquivo real precisa ser obtido do host de operação; um certificado novo ou de teste não autentica a instalação existente.

Não publicar chave privada nem pasta data inteira. Tratar a origem do certificado como parte da cadeia de confiança: distribuir um arquivo público não autoriza importar certificados desconhecidos. O documento não indica que o certificado real já foi enviado.

## Backup e verificação

Restringir .env, data, chaves e backups à conta do processo e administradores aprovados. Testar contas com concessões distintas, caminho fora do escopo, IDs de outra sessão, revogação, arquivo removido e downloads negados. Não ampliar permissões de rede ou arquivo para mascarar falhas de acesso. Veja [resultados](pilot-results.md) e [operação](operations.md).
