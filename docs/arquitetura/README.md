# Arquitetura do Sistema

O sistema é composto por um **servidor Python** que usa WebSockets para comunicação em tempo real e um **frontend web** com HTML, CSS e JS.

## Estrutura
```text
Servidor/
 ├── app/static/
 │    ├── index.html
 │    ├── src/css/
 │    ├── src/html/
 │    └── src/js/
 └── main.py



## Observação sobre QUIC/HTTP3

Caso o domínio esteja hospedado em um servidor com suporte a HTTP/3/QUIC, o carregamento dos arquivos estáticos é otimizado automaticamente.  
Esse recurso é transparente ao sistema e não altera a arquitetura do backend ou do WebSocket.

