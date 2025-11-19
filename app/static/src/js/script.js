const nameSection = document.getElementById("name-section");
const mainSection = document.getElementById("main-section");
const nicknameInput = document.getElementById("text-input");
const chatMessages = document.getElementById("chat-messages");
const usersList = document.getElementById("users-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const imageButton = document.getElementById("image-button");
const imageInput = document.getElementById("image-input");
const imagePreviewArea = document.getElementById("image-preview-area");
const previewImage = document.getElementById("preview-image");
const closePreviewButton = document.getElementById("close-preview-button");
const lightbox = document.getElementById("image-lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");

// Elementos de Vídeo
const callBtn = document.getElementById("call-btn");
const callModal = document.getElementById("call-modal");
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const hangupBtn = document.getElementById("hangup-btn");
const toggleMicBtn = document.getElementById("toggle-mic-btn");
const toggleCamBtn = document.getElementById("toggle-cam-btn");

let ws;
let selectedFile = null;
let localStream = null;
let peerConnection = null;
let isCaller = false;
let iceCandidatesQueue = [];
let isNegotiating = false;

const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

function enterChat(roomName) {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
        alert("Por favor, escolha um apelido.");
        return;
    }

    // Detecta se é HTTPS ou HTTP para usar wss ou ws
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomName}/${nickname}`;

    try {
        ws = new WebSocket(wsUrl);
    } catch (error) {
        console.error(error);
        alert("Erro ao tentar conectar ao servidor.");
        return;
    }

    setupWebSocketHandlers();
    setupImageUpload();
    setupMessageSending();
    setupLightbox();
    setupVideoCall();

    nameSection.classList.remove("active");
    mainSection.classList.add("active");
}

function setupWebSocketHandlers() {
    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        console.log("WS Recebido:", msg.type); // Debug

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
            case "signal":
                handleSignalMessage(msg);
                break;
        }
    };

    ws.onclose = () => {
        addNotification("Você foi desconectado.");
    };
}

// --- CHAT & UI ---

function updateUserList(users) {
    console.log("Atualizando lista de usuários:", users);
    usersList.innerHTML = "";
    users.forEach((user) => {
        const userElement = document.createElement("li");
        userElement.textContent = user;
        usersList.appendChild(userElement);
    });
}

function setupMessageSending() {
    if (messageForm) {
        messageForm.onsubmit = async (event) => {
            event.preventDefault();
            const messageContent = messageInput.value.trim();

            if (ws.readyState !== WebSocket.OPEN) return;

            if (selectedFile) {
                await uploadAndSendMessage(selectedFile, messageContent);
                selectedFile = null;
                hideImagePreview();
            } else if (messageContent) {
                ws.send(JSON.stringify({ type: "text", content: messageContent }));
            }
            messageInput.value = "";
        };
    }
}

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

// --- IMAGEM & UPLOAD ---

function setupImageUpload() {
    if (imageButton) imageButton.onclick = () => imageInput.click();
    if (closePreviewButton) closePreviewButton.onclick = hideImagePreview;
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
    };
    reader.readAsDataURL(file);
}

function hideImagePreview() {
    imagePreviewArea.style.display = "none";
    previewImage.src = "";
    selectedFile = null;
}

async function uploadAndSendMessage(file, caption) {
    const formData = new FormData();
    formData.append("file", file);
    try {
        const response = await fetch("/upload", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Erro upload");
        const data = await response.json();
        ws.send(JSON.stringify({ type: "image", url: data.url, content: caption }));
    } catch (error) {
        addNotification("Erro envio imagem.");
    }
}

function addImageMessage(sender, url, caption) {
    const msgElement = document.createElement("p");
    msgElement.className = "chat-message";
    msgElement.innerHTML = `<strong>${sender}:</strong><br>`;
    
    const imgElement = document.createElement("img");
    imgElement.src = url;
    imgElement.style.maxWidth = "200px";
    imgElement.style.marginTop = "5px";
    imgElement.onclick = () => openLightbox(url, caption);
    
    msgElement.appendChild(imgElement);
    if(caption) msgElement.innerHTML += `<br><span>${caption}</span>`;
    
    chatMessages.appendChild(msgElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- LIGHTBOX ---
function setupLightbox() {
    if (lightboxClose) lightboxClose.onclick = () => lightbox.style.display = "none";
    if (lightbox) lightbox.onclick = (e) => { if(e.target === lightbox) lightbox.style.display = "none"; };
}
function openLightbox(url, caption) {
    lightboxImage.src = url;
    lightboxCaption.textContent = caption || "";
    lightbox.style.display = "block";
}

// --- WEBRTC (VÍDEO CHAMADA) ---

function setupVideoCall() {
    callBtn.onclick = startCall;
    hangupBtn.onclick = endCall;
    toggleMicBtn.onclick = toggleMic;
    toggleCamBtn.onclick = toggleCam;
}

async function getFlexibleMediaStream() {
    try {
        // Tenta pegar vídeo e áudio
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        return stream;
    } catch (err) {
        console.warn("Falha ao pegar Camera+Mic. Tentando só Mic...", err);
        try {
            // Se falhar, tenta só áudio
            const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            return audioStream;
        } catch (errAudio) {
            console.error("Falha total de mídia. Modo Espectador.", errAudio);
            return null; // Retorna null se não tiver nada
        }
    }
}

function createPeerConnection() {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection(rtcConfig);

    // Envia candidatos ICE para o outro lado
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({
                type: "signal",
                signal_type: "candidate",
                candidate: event.candidate
            }));
        }
    };

    // Quando chegar vídeo do outro lado
    peerConnection.ontrack = (event) => {
        console.log("Stream remoto recebido!");
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.muted = false; // Garante que não está mutado
    };

    // Se eu tiver mídia local, adiciono à conexão
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    } else {
        // Se sou espectador, aviso que só quero receber
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
    }
}

async function startCall() {
    isCaller = true;
    callModal.style.display = "flex";
    iceCandidatesQueue = []; // Limpa fila antiga

    localStream = await getFlexibleMediaStream();
    updateLocalControls();

    createPeerConnection();

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({
            type: "signal",
            signal_type: "offer",
            offer: offer
        }));
    } catch (err) {
        console.error("Erro ao criar oferta:", err);
    }
}

async function handleSignalMessage(msg) {
    try {
        if (msg.signal_type === "offer") {
            // Alguém me ligou
            if (isCaller) return; // Evita conflito se ambos ligarem

            callModal.style.display = "flex";
            iceCandidatesQueue = []; 

            localStream = await getFlexibleMediaStream();
            updateLocalControls();

            createPeerConnection();

            await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
            await processIceQueue(); // Processa candidatos que chegaram cedo demais

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            ws.send(JSON.stringify({
                type: "signal",
                signal_type: "answer",
                answer: answer
            }));

        } else if (msg.signal_type === "answer") {
            // Alguém atendeu minha ligação
            if (!peerConnection) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
            await processIceQueue();

        } else if (msg.signal_type === "candidate") {
            // Chegou um pacote de rota (ICE)
            if (peerConnection && peerConnection.remoteDescription) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } else {
                // Se a conexão ainda não tá pronta, guarda na fila
                console.log("Guardando ICE Candidate na fila...");
                iceCandidatesQueue.push(msg.candidate);
            }

        } else if (msg.signal_type === "hangup") {
            closeModal();
        }
    } catch (error) {
        console.error("Erro no WebRTC Signal:", error);
    }
}

// Função para processar a fila de candidatos ICE atrasados
async function processIceQueue() {
    if (!peerConnection || !peerConnection.remoteDescription) return;
    
    while (iceCandidatesQueue.length > 0) {
        const candidate = iceCandidatesQueue.shift();
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Candidato da fila processado com sucesso.");
        } catch (e) {
            console.error("Erro ao processar candidato da fila:", e);
        }
    }
}

function updateLocalControls() {
    if (localStream) {
        localVideo.srcObject = localStream;
        localVideo.muted = true; // Muta meu próprio áudio pra não dar eco
        
        const hasVideo = localStream.getVideoTracks().length > 0;
        const hasAudio = localStream.getAudioTracks().length > 0;

        toggleCamBtn.disabled = !hasVideo;
        toggleMicBtn.disabled = !hasAudio;

        if (!hasVideo) {
            toggleCamBtn.textContent = "Sem Câmera";
            toggleCamBtn.style.backgroundColor = "#ea4335";
        }
    } else {
        // Modo Espectador
        localVideo.srcObject = null;
        toggleMicBtn.disabled = true;
        toggleCamBtn.disabled = true;
        toggleMicBtn.textContent = "Sem Mic";
        toggleCamBtn.textContent = "Sem Cam";
        toggleMicBtn.style.backgroundColor = "#ea4335";
        toggleCamBtn.style.backgroundColor = "#ea4335";
    }
}

function endCall() {
    ws.send(JSON.stringify({ type: "signal", signal_type: "hangup" }));
    closeModal();
}

function closeModal() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    callModal.style.display = "none";
    isCaller = false;
    iceCandidatesQueue = [];

    // Reseta botões
    toggleMicBtn.textContent = "Microfone";
    toggleMicBtn.style.backgroundColor = "#3c4043";
    toggleMicBtn.disabled = false;
    toggleCamBtn.textContent = "Câmera";
    toggleCamBtn.style.backgroundColor = "#3c4043";
    toggleCamBtn.disabled = false;
}

function toggleMic() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            toggleMicBtn.textContent = audioTrack.enabled ? "Microfone" : "Mutado";
            toggleMicBtn.style.backgroundColor = audioTrack.enabled ? "#3c4043" : "#ea4335";
        }
    }
}

function toggleCam() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            toggleCamBtn.textContent = videoTrack.enabled ? "Câmera" : "Sem Câmera";
            toggleCamBtn.style.backgroundColor = videoTrack.enabled ? "#3c4043" : "#ea4335";
        }
    }
}