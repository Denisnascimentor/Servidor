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

// Seletores para Imagem e Pré-visualização
const imageButton = document.getElementById("image-button");
const imageInput = document.getElementById("image-input");
const imagePreviewArea = document.getElementById("image-preview-area");
const previewImage = document.getElementById("preview-image");
const closePreviewButton = document.getElementById("close-preview-button");

// NOVO: Seletores do Lightbox
const lightbox = document.getElementById("image-lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");

let ws;
let selectedFile = null;

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
  setupImageUpload();
  setupMessageSending();
  setupLightbox();

  nameSection.classList.remove("active");
  mainSection.classList.add("active");
}

// -- Configura os "ouvintes" do WebSocket --

function setupWebSocketHandlers() {
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "chat":
        addChatMessage(msg.sender, msg.content);
        break;
      case "image":
        addImageMessage(msg.sender, msg.url, msg.content);
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

// --- Funções para gerenciar o envio de mensagens ---
function setupMessageSending() {
  if (messageForm) {
    messageForm.onsubmit = async (event) => {
      event.preventDefault();

      const messageContent = messageInput.value.trim();

      if (ws.readyState !== WebSocket.OPEN) {
        addNotification("Não conectado ao chat.");
        return;
      }

      if (selectedFile) {
        await uploadAndSendMessage(selectedFile, messageContent);
        selectedFile = null;
        hideImagePreview();
      } else if (messageContent) {
        const payload = {
          type: "text",
          content: messageContent,
        };
        ws.send(JSON.stringify(payload));
      }

      messageInput.value = "";
    };
  }
}

// --- Funções Auxiliares para atualizar o HTML ---

function addChatMessage(sender, content) {
  const msgElement = document.createElement("p");
  msgElement.style.textAlign = "left";
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

// --- Funções para PRÉ-VISUALIZAÇÃO E UPLOAD DE IMAGEM ---

function setupImageUpload() {
  if (imageButton) {
    imageButton.onclick = () => {
      imageInput.click();
    };
  }

  if (closePreviewButton) {
    closePreviewButton.onclick = () => {
      hideImagePreview();
    };
  }

  if (imageInput) {
    imageInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        selectedFile = file;
        showImagePreview(file);
      }
      imageInput.value = null;
    };
  }
}

function showImagePreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    imagePreviewArea.style.display = "flex";
    messageInput.placeholder = "Adicionar legenda...";
  };
  reader.readAsDataURL(file);
}

function hideImagePreview() {
  imagePreviewArea.style.display = "none";
  previewImage.src = "";
  selectedFile = null;
  messageInput.value = "";
  messageInput.placeholder = "Digite sua mensagem...";
}

async function uploadAndSendMessage(file, caption) {
  const formData = new FormData();
  formData.append("file", file);

  const submitButton = messageForm.querySelector(".btn-submit");
  const originalButtonText = submitButton.textContent;

  const loadingSpinner = document.createElement("div");
  loadingSpinner.className = "loading-spinner";
  submitButton.textContent = "Enviando...";
  submitButton.disabled = true;
  submitButton.closest(".buttons").appendChild(loadingSpinner);

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Falha no upload da imagem.");
    }

    const data = await response.json();
    const imageUrl = data.url;

    const payload = {
      type: "image",
      url: imageUrl,
      content: caption,
    };
    ws.send(JSON.stringify(payload));
  } catch (error) {
    addNotification("Erro ao enviar imagem: " + error.message);
  } finally {
    if (loadingSpinner.parentNode) {
      loadingSpinner.parentNode.removeChild(loadingSpinner);
    }
    submitButton.textContent = originalButtonText;
    submitButton.disabled = false;
  }
}

function addImageMessage(sender, url, caption) {
  const msgElement = document.createElement("p");
  msgElement.className = "chat-message";
  msgElement.style.textAlign = "left";

  const senderElement = document.createElement("strong");
  senderElement.textContent = sender + ":";
  msgElement.appendChild(senderElement);
  msgElement.appendChild(document.createElement("br"));

  const imgElement = document.createElement("img");
  imgElement.src = url;
  imgElement.alt = "Imagem enviada por " + sender;
  imgElement.style.maxWidth = "250px";
  imgElement.style.borderRadius = "8px";
  imgElement.style.marginTop = "5px";
  imgElement.style.display = "block";
  imgElement.style.cursor = "pointer";

  imgElement.onclick = () => {
    openLightbox(url, caption);
  };

  msgElement.appendChild(imgElement);

  if (caption && caption.trim() !== "") {
    const captionElement = document.createElement("span");
    captionElement.style.display = "block";
    captionElement.style.textAlign = "left";
    captionElement.style.marginTop = "5px";
    captionElement.style.fontSize = "0.9em";
    captionElement.style.wordWrap = "break-word";
    captionElement.style.maxWidth = "250px";
    captionElement.textContent = caption;
    msgElement.appendChild(captionElement);
  }

  chatMessages.appendChild(msgElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- LIGHTBOX (MODAL) ---

function setupLightbox() {
  if (lightboxClose) {
    lightboxClose.onclick = () => {
      closeLightbox();
    };
  }
  if (lightbox) {
    lightbox.onclick = (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    };
  }
}

function openLightbox(url, caption) {
  if (lightbox) {
    lightboxImage.src = url;
    if (caption && caption.trim() !== "") {
      lightboxCaption.textContent = caption;
      lightboxCaption.style.display = "block";
    } else {
      lightboxCaption.style.display = "none";
    }
    lightbox.style.display = "block";
  }
}

function closeLightbox() {
  if (lightbox) {
    lightbox.style.display = "none";
  }
}
