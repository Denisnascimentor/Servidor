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
