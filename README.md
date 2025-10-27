# Servidor Web do Grupo Oito

Aplicação de um **servidor web de uma página** (Trabalho 08), com salas de bate-papo em tempo real via WebSocket.

Equipe: Jefferson Amaral, Mariana Mota, Denis Nascimento, Victor Correia, Kaio

- Produção: https://kaio.baselinux.net/
- Repositório: https://github.com/Denisnascimentor/Servidor

## Visão Geral
Usuário define um **apelido**, escolhe ou cria **salas** (Tecnologia, Jogos, Assuntos diversos, Estudos), envia mensagens e vê quem está online em cada sala. O servidor roteia mensagens **apenas** para a sala correta e mantém o **estado** (quem está em qual sala).

## Stack
- **Backend:** Python (websockets) — `main.py`
- **Frontend:** HTML/CSS/JS em `app/static` e `app/static/src`
- **Deploy:** VPS Linux (SSH + Git)
  
## 📦 Requisitos para rodar local
- Linux (testado no Ubuntu)
- Python 3.10+  
- Git
- (Opcional) Docker / Docker Compose



## Estrutura de pastas (resumo)

app/
  static/
    index.html
    images/
    src/
      css/        # style.css, tech.css
      html/       # tech.html, game.html, study.html, anything.html
      js/         # script.js
main.py
dockerfile
docker-compose.yml
requirements.txt
docs/
  requisitos/
  arquitetura/
  deploy/




