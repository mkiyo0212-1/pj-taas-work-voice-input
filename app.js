'use strict';

// ===== DOM refs =====
const messageList = document.getElementById('messageList');
const chatArea    = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const sendBtn     = document.getElementById('sendBtn');
const voiceBtn    = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');

// ===== Auto-resize textarea =====
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
});

// ===== Send on Enter (Shift+Enter = newline) =====
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ===== Send message =====
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  appendMessage('user', text);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Simulate AI response (replace with actual API call)
  showTyping();
  setTimeout(() => {
    removeTyping();
    appendMessage('assistant', generateEchoResponse(text));
    sendBtn.disabled = false;
  }, 800 + Math.random() * 600);
}

// ===== Append message bubble =====
function appendMessage(role, text) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? 'You' : 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  messageList.appendChild(wrapper);
  scrollToBottom();
}

// ===== Typing indicator =====
let typingEl = null;

function showTyping() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message assistant';
  wrapper.id = 'typingWrapper';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'AI';

  const indicator = document.createElement('div');
  indicator.className = 'bubble typing-indicator';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    indicator.appendChild(dot);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(indicator);
  messageList.appendChild(wrapper);
  typingEl = wrapper;
  scrollToBottom();
}

function removeTyping() {
  if (typingEl) {
    typingEl.remove();
    typingEl = null;
  }
}

// ===== Scroll to bottom =====
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ===== Simple echo response (demo) =====
function generateEchoResponse(text) {
  const responses = [
    `「${text}」を受け取りました。実際のAI連携を実装するとここに回答が表示されます。`,
    `ご入力ありがとうございます。「${text}」というメッセージですね。`,
    `承知しました。「${text}」について確認いたします。`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ===== Voice Input (Web Speech API) =====
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let isRecording = false;
let interimText  = '';

if (!SpeechRecognition) {
  voiceBtn.title = 'このブラウザは音声認識に対応していません';
  voiceBtn.style.opacity = '0.4';
  voiceBtn.style.cursor  = 'not-allowed';
  voiceBtn.disabled = true;
  voiceStatus.textContent = '※ 音声入力はChrome / Edgeで利用できます';
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add('recording');
    voiceBtn.setAttribute('aria-label', '音声認識中 – クリックで停止');
    voiceStatus.className = 'voice-status active';
    voiceStatus.textContent = '音声を認識しています...';
    interimText = '';
  };

  recognition.onresult = (event) => {
    let interim = '';
    let final   = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += t;
      } else {
        interim += t;
      }
    }

    if (final) {
      // Append to existing text with a space if needed
      const current = messageInput.value;
      messageInput.value = current + (current && !current.endsWith('\n') ? ' ' : '') + final;
      messageInput.style.height = 'auto';
      messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + 'px';
      interimText = '';
    }

    voiceStatus.textContent = interim
      ? `認識中: 「${interim}」`
      : '音声を認識しています...';
  };

  recognition.onerror = (event) => {
    const msgs = {
      'no-speech'         : '音声が検出されませんでした。もう一度お試しください。',
      'audio-capture'     : 'マイクへのアクセスができませんでした。',
      'not-allowed'       : 'マイクのアクセス許可が必要です。',
      'network'           : 'ネットワークエラーが発生しました。',
    };
    voiceStatus.className = 'voice-status';
    voiceStatus.textContent = msgs[event.error] || `エラー: ${event.error}`;
    stopRecording();
  };

  recognition.onend = () => {
    stopRecording();
    if (!voiceStatus.textContent.includes('エラー') &&
        !voiceStatus.textContent.includes('できませんでした') &&
        !voiceStatus.textContent.includes('必要')) {
      voiceStatus.className = 'voice-status';
      voiceStatus.textContent = '音声入力が完了しました。';
      setTimeout(() => { voiceStatus.textContent = ''; }, 2000);
    }
  };

  voiceBtn.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      startRecording();
    }
  });
}

function startRecording() {
  try {
    recognition.start();
  } catch (e) {
    voiceStatus.textContent = '音声認識を開始できませんでした。';
  }
}

function stopRecording() {
  isRecording = false;
  voiceBtn.classList.remove('recording');
  voiceBtn.setAttribute('aria-label', '音声入力開始');
}
