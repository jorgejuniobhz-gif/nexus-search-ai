# Rede local, DNS e HTTPS

## Endereço e nome estáveis

Reserve no DHCP o endereço do host que executa Nexus/Everything, usando o MAC da placa Ethernet correta. No pfSense com backend ISC, o mapeamento estático precisa ficar fora dos pools dinâmicos. Confira a disponibilidade do endereço e salve/aplique a configuração. Uma reserva DHCP pressupõe que o Windows esteja configurado para obter endereço automaticamente.

No pfSense, em Services → DNS Resolver → Host Overrides, cadastre o host nexus, o domínio local usado pelo DHCP e o endereço reservado do host. Salve e aplique. Os clientes precisam consultar um DNS que resolva esse cadastro e receber o sufixo de pesquisa adequado para usar o nome curto. Em redes com DNS corporativo, mantenha o desenho de DNS existente e cadastre o nome nele.

Use os valores reais somente no ambiente local. O repositório não contém o endereço, MAC, hostname físico ou domínio específico da instalação. Não é necessário editar hosts em cada PC quando a resolução DNS central funciona.

A URL precisa usar o nome exato de NEXUS_PUBLIC_ORIGIN e do certificado. Com o assistente configurado para nexus, use https://nexus:3443. A resolução de nexus por um sufixo DNS não acrescenta automaticamente o nome completo ao certificado. Acesso pelo IP ou por um nome diferente pode ser recusado pelo certificado e pelo backend.

## Preparar HTTPS pela primeira vez

Na pasta da instalação já configurada, com o Nexus parado:

~~~cmd
npm.cmd run setup:https -- --name nexus
~~~

O assistente gera material TLS local, protege a pasta no Windows, faz backup do .env e prepara accounts/0.0.0.0/3443 com a origem https://nexus:3443. Preserva contas, concessões e opção de download. Ele não instala confiança nos clientes, não abre firewall nem cria serviço ou tarefa de inicialização.

A autoridade local vale por 5 anos e o certificado de servidor por 1 ano. A chave de assinatura da autoridade só existe durante a geração e não é salva. O assistente reutiliza material válido e recusa substituição quando inválido, de outro nome ou próximo do vencimento. Ele não renova automaticamente. Planeje a substituição e a redistribuição de confiança antes do vencimento.

Pode-se usar certificado emitido pela infraestrutura da rede em vez do assistente. Nesse caso, configure NEXUS_TLS_CERT, NEXUS_TLS_KEY e NEXUS_PUBLIC_ORIGIN; certifique-se de que nome, cadeia e porta sejam coerentes.

## Confiança nos computadores

Copie somente o certificado público nexus-ca.cer da instalação de origem, normalmente em data/tls, por um canal interno confiável. Confira sua procedência e impressão SHA-256. Não copie a pasta inteira e não gere outra autoridade em cada cliente.

Para o usuário Windows que abrirá o navegador:

~~~cmd
certutil -user -addstore Root CAMINHO-DO-ARQUIVO\nexus-ca.cer
~~~

Substitua CAMINHO-DO-ARQUIVO pela pasta onde salvou o certificado. Esse comando afeta o perfil Windows atual, não todos os usuários do computador.

Alternativa gráfica: abra o .cer, escolha Instalar Certificado → Usuário Atual → Colocar todos os certificados no repositório a seguir → Autoridades de Certificação Raiz Confiáveis → Concluir. Confirme apenas a autoridade conferida. Feche e reabra o navegador.

Se houver administração por domínio, a confiança pode ser distribuída por política de grupo. DNS no pfSense resolve o nome; não instala confiança de certificado nos clientes.

O .cer público pode ser distribuído no repositório mediante autorização específica. A autorização não transforma chaves ou bases em arquivos publicáveis. A documentação não afirma que o certificado real já foi anexado: ele deve vir do host que serve o Nexus. A chave server-key.pem, .env e data/users.json permanecem privados.

## Firewall e exposição

Libere somente a porta HTTPS do Nexus para as sub-redes aprovadas, no firewall do host. A regra depende dos endereços e perfis reais da instalação. Para clientes e host na mesma LAN, não configure encaminhamento de porta WAN. O escopo descrito é a rede interna.

Everything deve continuar bind em 127.0.0.1:8888; desative seu download HTTP e não publique essa porta na LAN. O Nexus usa uma URL upstream fixa e recusa proxy genérico e cabeçalhos de identidade encaminhada.

## Testar

1. Consulte o nome no DNS configurado, a partir de outro PC. Confira se retorna o endereço reservado.
2. Abra a origem HTTPS exata, com o Nexus iniciado no host.
3. Confira a validade/nome/cadeia do certificado e a ausência de aviso de confiança.
4. Entre com duas contas de pastas distintas e compare árvore, resultados, totais e downloads.
5. Reinicie o host em janela de manutenção e confira Everything, Nexus e acesso de outro PC.

Se o navegador mostrar ERR_CERT_AUTHORITY_INVALID, confira a instalação da autoridade correta no perfil atual. Não desative a validação nem contorne o aviso. Veja [diagnóstico](https://github.com/jorgejuniobhz-gif/nexus-search-ai/blob/main/docs/troubleshooting.md).
