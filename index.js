// State variables
let mediaRecorder = null;
let chunks = [];
let isRecording = false;

const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const audioDevicesSelect = document.getElementById('audioDevices');
const recordBtn = document.getElementById('recordBtn');
const transcriptionResult = document.getElementById('transcriptionResult');
const copyBtn = document.getElementById('copyBtn');
const historyList = document.getElementById('historyList');
const modelSelect = document.getElementById('modelSelect');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const waveformCanvas = document.getElementById('waveform');
const canvasCtx = waveformCanvas.getContext('2d');
const waveformContainer = document.querySelector('.waveform-container');

let transcriptionHistory = JSON.parse(localStorage.getItem('transcriptionHistory') || '[]');

// Waveform audio analysis nodes
let audioContext;
let analyser;
let dataArray;
let animationId;

// Load API key from localStorage if available
const storedApiKey = localStorage.getItem('groqApiKey');
if (storedApiKey) {
  apiKeyInput.value = storedApiKey;
}

// Add near the top with other localStorage loading
const storedModel = localStorage.getItem('selectedModel');
if (storedModel) {
  modelSelect.value = storedModel;
}

function updateHistoryUI() {
  historyList.innerHTML = '';
  // Reverse chronological order (most recent first)
  for (let i = transcriptionHistory.length - 1; i >= 0; i--) {
    const text = transcriptionHistory[i];

    const container = document.createElement('div');
    container.className = 'bg-zinc-800 border border-zinc-700 rounded p-4 flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0 sm:space-x-4';

    const textSpan = document.createElement('span');
    textSpan.className = 'flex-1 whitespace-pre-wrap break-words';
    textSpan.textContent = text;

    const btnGroup = document.createElement('div');
    btnGroup.className = 'flex items-center space-x-2';

    const copyItemBtn = document.createElement('button');
    copyItemBtn.className = 'px-2 py-2 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700';
    copyItemBtn.innerHTML = '<i data-lucide="clipboard" class="w-4 h-4"></i>';
    copyItemBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(text)
    });

    const deleteItemBtn = document.createElement('button');
    deleteItemBtn.className = 'px-2 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700';
    deleteItemBtn.innerHTML = '<i data-lucide="trash" class="w-4 h-4"></i>';
    deleteItemBtn.addEventListener('click', () => {
      // Delete this item from transcriptionHistory
      transcriptionHistory.splice(i, 1);
      localStorage.setItem('transcriptionHistory', JSON.stringify(transcriptionHistory));
      updateHistoryUI();
    });

    btnGroup.appendChild(copyItemBtn);
    btnGroup.appendChild(deleteItemBtn);

    container.appendChild(textSpan);
    container.appendChild(btnGroup);

    historyList.appendChild(container);
  }
  lucide.createIcons();
}

updateHistoryUI();

saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('groqApiKey', key);
    alert('API key saved!');
  } else {
    alert('Please enter a valid API key.');
  }
});

// Enumerate audio devices
async function getAudioDevices() {
  try {
    // Request microphone permissions and get a stream
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(d => d.kind === 'audioinput');

    // Clear the dropdown
    audioDevicesSelect.innerHTML = '';

    // Populate the dropdown and auto-select the default device
    audioInputs.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Microphone ${index + 1}`;
      audioDevicesSelect.appendChild(option);

      // Select this option if it's the default device
      if (device.deviceId === "default") {
        option.selected = true;
      }
    });

    // Stop the stream to release the microphone
    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    console.error('Error fetching audio devices or microphone permissions denied:', err);
    return;
  }
}

// Call the function to initialize the dropdown
getAudioDevices();

async function startRecording() {
  const deviceId = audioDevicesSelect.value;
  const constraints = {
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    video: false
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Set up MediaRecorder
  chunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => {
    chunks.push(e.data);
  };
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const file = new File([blob], "audio.webm", { type: "audio/webm" });
    await sendToGroq(file);
    stopVisualizer();
    waveformContainer.classList.remove('recording');
  };

  mediaRecorder.start();
  isRecording = true;
  recordBtn.textContent = 'Stop';
  recordBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
  recordBtn.classList.add('bg-red-600', 'hover:bg-red-700');

  // Show waveform container and start visualizer
  waveformContainer.classList.add('recording');
  requestAnimationFrame(() => {
    resizeCanvas();
    startVisualizer(stream);
  });
}

function stopRecording() {
  if (isRecording) {
    isRecording = false;
    mediaRecorder.stop();
    recordBtn.textContent = 'Record';
    recordBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
    recordBtn.classList.add('bg-green-600', 'hover:bg-green-700');
  }
}

recordBtn.addEventListener('click', () => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// Spacebar to toggle recording
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
});

async function sendToGroq(file) {
  const apiKey = localStorage.getItem('groqApiKey');
  if (!apiKey) {
    alert('Please enter and save your Groq API key before transcribing.');
    return;
  }
  
  const model = modelSelect.value;
  const formData = new FormData();
  formData.append('audio', file, 'audio.webm');
  formData.append('apiKey', apiKey);
  formData.append('model', model);

  transcriptionResult.textContent = 'Transcribing...';

  try {
    const response = await fetch('/transcribe', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      transcriptionResult.textContent = 'Error: Failed to get transcription.';
      return;
    }

    const data = await response.json();
    if (data.error) {
      transcriptionResult.textContent = 'Error: ' + data.error;
      return;
    }

    const text = data.text.trim() || '';
    transcriptionResult.textContent = text;

    // Copy to clipboard automatically
    copyToClipboard(text);

    // Save to history
    transcriptionHistory.push(text);
    localStorage.setItem('transcriptionHistory', JSON.stringify(transcriptionHistory));
    updateHistoryUI();
    
  } catch (err) {
    transcriptionResult.textContent = 'Error: ' + err.message;
  }
}

// Function to handle copy button state changes
function updateCopyButtonState(success = true) {
  const originalText = 'Copy to Clipboard';
  const successText = 'Copied to Clipboard!';
  
  if (success) {
    copyBtn.textContent = successText;
    copyBtn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
    copyBtn.classList.add('bg-green-600', 'hover:bg-green-700');
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
      copyBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
    }, 2000);
  }
}

function copyToClipboard(str) {
  navigator.clipboard.writeText(str).then(() => {
    console.log('Copied to clipboard');
    updateCopyButtonState(true);
  }).catch(err => {
    console.error('Failed to copy:', err);
    updateCopyButtonState(false);
  });
}

copyBtn.addEventListener('click', () => {
  const text = transcriptionResult.textContent;
  copyToClipboard(text);
});

deleteAllBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to delete all transcriptions?")) {
    transcriptionHistory = [];
    localStorage.removeItem('transcriptionHistory');
    updateHistoryUI();
  }
});

function startVisualizer(stream) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create analyzer node
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Connect audio nodes
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);

  // Start animation
  function draw() {
    animationId = requestAnimationFrame(draw);
    drawWaveform();
  }
  draw();
}

function drawWaveform() {
  const width = waveformCanvas.width;
  const height = waveformCanvas.height;
  
  analyser.getByteTimeDomainData(dataArray);
  
  canvasCtx.fillStyle = '#27272a';
  canvasCtx.fillRect(0, 0, width, height);
  
  canvasCtx.lineWidth = 1;
  canvasCtx.strokeStyle = '#a1a1aa';
  canvasCtx.beginPath();
  
  const sliceWidth = width / dataArray.length;
  let x = 0;
  
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;
    
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  
  canvasCtx.lineTo(width, height / 2);
  canvasCtx.stroke();
}

function stopVisualizer() {
  cancelAnimationFrame(animationId);
  if (audioContext) {
    audioContext.close().catch(err => console.error(err));
    audioContext = null;
  }
  // Clear the waveform
  canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
}

// Resize canvas to its displayed size
function resizeCanvas() {
  waveformCanvas.width = waveformCanvas.clientWidth;
  waveformCanvas.height = waveformCanvas.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Add this event listener after other event listeners
modelSelect.addEventListener('change', () => {
  localStorage.setItem('selectedModel', modelSelect.value);
});