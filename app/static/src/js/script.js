// Seletores das seções
const nameSection = document.getElementById("name-section");
const mainSection = document.getElementById("main-section");

// Seletores dos elementos de Login
const nicknameInput = document.getElementById("text-input");

// Seletores dos elementos do Chat
const chatMessages = document.getElementById("chat-messages");
const usersList = document.getElementById("users-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");

let ws;

/**
 * Esta função é chamada pelo botão "Entrar"
 * Ela lê o apelido, conecta ao WebSocket e troca as telas.
 */
function enterChat(roomName) {
  const nickname = nicknameInput.value.trim();

  if (!nickname) {
    alert("Por favor, escolha um apelido.");
    return;
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomName}/${nickname}`;

  try {
    ws = new WebSocket(wsUrl);
  } catch (error) {
    alert("Erro ao tentar conectar ao servidor.");
    return;
  }

  setupWebSocketHandlers();

  nameSection.classList.remove("active");
  mainSection.classList.add("active");
}

// --  Configura os "ouvintes" do WebSocket --

function setupWebSocketHandlers() {
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "chat":
        addChatMessage(msg.sender, msg.content);
        break;
      case "notification":
        addNotification(msg.content);
        break;
      case "user_list":
        updateUserList(msg.users);
        break;
    }
  };

  ws.onclose = () => {
    addNotification("Você foi desconectado.");
  };

  ws.onerror = (error) => {
    addNotification("Erro de conexão.");
  };
}

// Configura o formulário de envio de mensagem
if (messageForm) {
  messageForm.onsubmit = (event) => {
    event.preventDefault();
    const message = messageInput.value;
    if (message.trim() && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      messageInput.value = "";
    }
  };
}

// --- Funções Auxiliares para atualizar o HTML ---

function addChatMessage(sender, content) {
  const msgElement = document.createElement("p");
  msgElement.innerHTML = `<strong>${sender}:</strong> ${content}`;
  chatMessages.appendChild(msgElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addNotification(content) {
  const notifElement = document.createElement("p");
  notifElement.className = "notification";
  notifElement.textContent = content;
  chatMessages.appendChild(notifElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateUserList(users) {
  usersList.innerHTML = "";
  users.forEach((user) => {
    const userElement = document.createElement("li");
    userElement.textContent = user;
    usersList.appendChild(userElement);
  });
}
