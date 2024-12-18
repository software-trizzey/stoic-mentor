const messages = [];
const speechSynthesis = window.speechSynthesis;
const STORAGE_KEYS = {
    SPEECH_CONSENT: 'stoicMentor.speechConsent',
    SPEECH_ENABLED: 'stoicMentor.speechEnabled',
    MICROPHONE_CONSENT: 'stoicMentor.microphoneConsent'
};

let hasUserConsented = localStorage.getItem(STORAGE_KEYS.SPEECH_CONSENT) === 'true';
let isSpeechEnabled = hasUserConsented && localStorage.getItem(STORAGE_KEYS.SPEECH_ENABLED) !== 'false';
let hasMicrophoneConsent = localStorage.getItem(STORAGE_KEYS.MICROPHONE_CONSENT) === 'true';

if (!speechSynthesis) {
    console.warn('Speech synthesis not supported');
    document.getElementById('speechToggle').style.display = 'none';
}

if (
    navigator?.brave ||
    navigator?.userAgent?.toLowerCase()?.includes('brave') ||
    navigator?.userAgentData?.brands?.some(brand => brand.brand === 'Brave')
) {
    document.getElementById('voiceInputToggle').style.display = 'none';
}

function toggleSpeech() {
    if (!hasUserConsented) {
        requestSpeechConsent();
        return;
    }
    isSpeechEnabled = !isSpeechEnabled;
    localStorage.setItem(STORAGE_KEYS.SPEECH_ENABLED, isSpeechEnabled);
    
    const speechToggle = document.getElementById('speechToggle');
    const textModeIcon = document.getElementById('textModeIcon');
    const speechModeIcon = document.getElementById('speechModeIcon');
    
    if (isSpeechEnabled) {
        speechModeIcon.style.display = 'inline';
        textModeIcon.style.display = 'none';
        speechToggle.classList.add('active');
    } else {
        speechModeIcon.style.display = 'none';
        textModeIcon.style.display = 'inline';
        speechToggle.classList.remove('active');
    }

    if (!isSpeechEnabled) {
        speechSynthesis.cancel();
    }
}

let autoListening = false;

function speakText(text, messageDiv) {
    if (!isSpeechEnabled || !hasUserConsented) {
        messageDiv.classList.remove('loading-state');
        messageDiv.textContent = text;
        messageDiv.style.visibility = 'visible';
        isGenerating = false;
        document.getElementById('messageInput').disabled = false;
        return;
    }
    
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = speechSynthesis.getVoices();
    const maleVoice = voices.find(voice => 
        voice.name.includes("Eddy (English (United Kingdom))") ||
        voice.name.includes("Daniel (English (United Kingdom))")
    );
    
    if (maleVoice) {
        utterance.voice = maleVoice;
    }
    
    utterance.pitch = 0.8;
    utterance.rate = 0.9;
    
    const textContainer = document.createElement('span');
    textContainer.className = 'message-text';
    textContainer.textContent = text;
    
    const soundWave = messageDiv.querySelector('.sound-wave');
    messageDiv.textContent = '';
    if (soundWave) {
        messageDiv.appendChild(soundWave);
        soundWave.classList.add('active');
    }
    messageDiv.appendChild(textContainer);
    
    if (isImmersiveMode && audioContext && analyser) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(analyser);
        
        utterance.onstart = () => {
            if (soundWave) {
                soundWave.classList.add('active');
            }
            oscillator.start();
        };
        
        utterance.onend = () => {
            if (soundWave) {
                soundWave.classList.remove('active');
            }
            oscillator.stop();
            messageDiv.classList.remove('loading-state');
            messageDiv.style.visibility = 'visible';
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            isGenerating = false;
            document.getElementById('messageInput').disabled = false;
            
            if (autoListening && recognition) {
                setTimeout(() => {
                    toggleVoiceInput();
                }, 1000);
            }
        };

        utterance.onerror = () => {
            if (soundWave) {
                soundWave.classList.remove('active');
            }
            oscillator.stop();
            messageDiv.classList.remove('loading-state');
            messageDiv.style.visibility = 'visible';
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            isGenerating = false;
            document.getElementById('messageInput').disabled = false;
        };
    } else {
        utterance.onstart = () => {
            if (soundWave) {
                soundWave.classList.add('active');
            }
        };
        
        utterance.onend = () => {
            if (soundWave) {
                soundWave.classList.remove('active');
            }
            messageDiv.classList.remove('loading-state');
            messageDiv.style.visibility = 'visible';
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            isGenerating = false;
            document.getElementById('messageInput').disabled = false;
            
            if (autoListening && recognition) {
                setTimeout(() => {
                    toggleVoiceInput();
                }, 1000);
            }
        };

        utterance.onerror = () => {
            if (soundWave) {
                soundWave.classList.remove('active');
            }
            messageDiv.classList.remove('loading-state');
            messageDiv.style.visibility = 'visible';
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            isGenerating = false;
            document.getElementById('messageInput').disabled = false;
        };
    }

    speechSynthesis.speak(utterance);
}

document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

let isGenerating = false;

async function sendMessage() {
    if (isGenerating) return;
    
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    isGenerating = true;
    input.disabled = true;
    
    if (isImmersiveMode) {
        setWaveThinkingState(true);
    }
    
    addMessageToChat('user', message);
    input.value = '';
    
    messages.push({
        role: "user",
        content: message
    });
    
    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages,
                philosopher: "marcus_aurelius"
            }),
        });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message philosopher-message';
        if (isSpeechEnabled) {
            messageDiv.style.visibility = 'visible';
            messageDiv.textContent = 'Speaking';
            messageDiv.classList.add('loading-state');
        }
        document.getElementById('chatMessages').appendChild(messageDiv);
        
        let fullResponse = '';
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        fullResponse += data.content;
                        if (!isSpeechEnabled) {
                            messageDiv.textContent = fullResponse;
                            messageDiv.style.visibility = 'visible';
                            messageDiv.scrollIntoView({ behavior: 'smooth' });
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }
        
        messages.push({
            role: "assistant",
            content: fullResponse
        });
        
        if (isImmersiveMode) {
            setWaveThinkingState(false);
        }
        
        if (isSpeechEnabled) {
            speakText(fullResponse, messageDiv);
        } else {
            messageDiv.classList.remove('loading-state');
            messageDiv.textContent = fullResponse;
            messageDiv.style.visibility = 'visible';
            messageDiv.scrollIntoView({ behavior: 'smooth' });
            isGenerating = false;
            input.disabled = false;
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (isImmersiveMode) {
            setWaveThinkingState(false);
        }
        addMessageToChat('system', 'Error: Could not get response from the philosopher');
        isGenerating = false;
        input.disabled = false;
    }
}

function addMessageToChat(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const textContainer = document.createElement('span');
    textContainer.className = 'message-text';
    textContainer.textContent = content;
    messageDiv.appendChild(textContainer);
    
    if (role === 'philosopher') {
        const soundWave = document.createElement('div');
        soundWave.className = 'sound-wave';
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement('span');
            soundWave.appendChild(bar);
        }
        messageDiv.insertBefore(soundWave, textContainer);
    }
    
    if (role === 'user' || role === 'system' || !isSpeechEnabled) {
        messageDiv.style.visibility = 'visible';
    }
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
        
async function requestSpeechConsent() {
    if (hasUserConsented) return true;
    
    const consent = confirm('Would you like to enable voice responses from the Stoic Mentor?');
    
    if (consent) {
        hasUserConsented = true;
        isSpeechEnabled = true;
        localStorage.setItem(STORAGE_KEYS.SPEECH_CONSENT, 'true');
        localStorage.setItem(STORAGE_KEYS.SPEECH_ENABLED, 'true');
        const test = new SpeechSynthesisUtterance('');
        speechSynthesis.speak(test);
        const button = document.getElementById('speechToggle');
        return true;
    } else {
        isSpeechEnabled = false;
        hasUserConsented = false;
        localStorage.setItem(STORAGE_KEYS.SPEECH_CONSENT, 'false');
        localStorage.setItem(STORAGE_KEYS.SPEECH_ENABLED, 'false');
        const button = document.getElementById('speechToggle');
        return false;
    }
}

const isSecureContext = window.isSecureContext;
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const mediaDevicesSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
let recognition;
let isListening = false;
let voiceTimeout = null;
const VOICE_TIMEOUT_MS = 1500; // 1.5 seconds of silence before submitting

if (!SpeechRecognition || !mediaDevicesSupported || (!isSecureContext && !isLocalhost)) {
    console.warn('Speech recognition unavailable:', {
        speechRecognitionSupported: !!SpeechRecognition,
        mediaDevicesSupported: mediaDevicesSupported,
        secureContext: isSecureContext,
        isLocalhost: isLocalhost
    });
    
    const voiceInputButton = document.getElementById('voiceInputToggle');
    voiceInputButton.style.display = 'none';
    
    if (!isSecureContext && !isLocalhost) {
        console.warn('Voice input requires a secure (HTTPS) connection');
    }
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
}

/**
 * Note: Brave browser does not support speech recognition API.
 * These users will hit a network error when using voice input.
 * More: https://github.com/brave/brave-browser/issues/3725#issuecomment-555694620
 */
async function toggleVoiceInput() {
    if (!recognition || !mediaDevicesSupported) {
        if (!isSecureContext && !isLocalhost) {
            alert('Voice input requires a secure (HTTPS) connection');
        } else {
            alert('Voice input is not supported in your browser');
        }
        return;
    }
    
    if (isListening) {
        try {
            recognition.stop();
            document.getElementById('voiceInputToggle').classList.remove('active');
            if (microphoneStream) {
                microphoneStream.getTracks().forEach(track => track.stop());
                microphoneStream = null;
            }
        } catch (err) {
            console.error('Error stopping recognition:', err);
        }
        return;
    }

    if (speechSynthesis.speaking) {
        return;
    }

    if (!hasMicrophoneConsent) {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            hasMicrophoneConsent = true;
            localStorage.setItem(STORAGE_KEYS.MICROPHONE_CONSENT, 'true');
        } catch (err) {
            console.error('Microphone permission denied:', err);
            alert('Microphone permission is required for voice input.');
            return;
        }
    }

    try {
        // Setup audio context if in immersive mode
        if (isImmersiveMode && !audioContext) {
            setupAudioAnalyzer();
        }

        // Connect microphone if in immersive mode
        if (isImmersiveMode && !microphoneStream) {
            await connectMicrophone();
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        recognition.start();
        const input = document.getElementById('messageInput');
        input.placeholder = 'Listening...';
        const voiceInputToggle = document.getElementById('voiceInputToggle');
        voiceInputToggle.setAttribute('data-listening', 'true');
        voiceInputToggle.classList.add('active');
    } catch (err) {
        console.error('Speech recognition error:', err);
        isListening = false;
        const voiceInputToggle = document.getElementById('voiceInputToggle');
        voiceInputToggle.removeAttribute('data-listening');
        voiceInputToggle.classList.remove('active');
        resetVoiceInput();
    }
}

function resetVoiceInput() {
    isListening = false;
    if (voiceTimeout) {
        clearTimeout(voiceTimeout);
        voiceTimeout = null;
    }
    
    if (!isImmersiveMode && microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
    }
    
    const input = document.getElementById('messageInput');
    input.placeholder = 'Ask your question...';
    const voiceInputToggle = document.getElementById('voiceInputToggle');
    voiceInputToggle.removeAttribute('data-listening');
    voiceInputToggle.classList.remove('active');
    
    if (autoListening) {
        autoListening = false;
        document.getElementById('autoListenToggle').classList.remove('active');
    }
}

const STOP_WORDS = ['send', 'send message', 'send it'];

function logRecognitionEvent(type, details) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Speech Recognition ${type}:`, details);
}

if (recognition) {
    let lastSpeechEndTime = 0;
    
    recognition.onstart = async () => {
        logRecognitionEvent('start', {
            autoListening: autoListening,
            isGenerating: isGenerating
        });
        isListening = true;
        document.getElementById('voiceInputToggle').setAttribute('data-listening', 'true');
        
        if (isImmersiveMode) {
            const waveStatus = document.querySelector('.wave-status');
            waveStatus.textContent = 'Listening...';
            await connectMicrophone();
        }
    };

    recognition.onresult = (event) => {
        logRecognitionEvent('result', {
            results: Array.from(event.results).map(result => ({
                transcript: result[0].transcript,
                confidence: result[0].confidence
            }))
        });
        
        const input = document.getElementById('messageInput');
        const transcript = event.results[0][0].transcript;
        const lowerTranscript = transcript.toLowerCase();
        
        const endsWithStopWord = STOP_WORDS.some(stopWord => 
            lowerTranscript.endsWith(stopWord)
        );
        
        if (endsWithStopWord) {
            const cleanTranscript = STOP_WORDS.reduce((text, stopWord) => {
                if (lowerTranscript.endsWith(stopWord)) {
                    return transcript.slice(0, -stopWord.length).trim();
                }
                return text;
            }, transcript);
            
            input.value = cleanTranscript;
            isListening = false;
            document.getElementById('voiceInputToggle').removeAttribute('data-listening');
            sendMessage();
        } else {
            input.value = transcript;
            // Set timeout to submit after getting result
            if (voiceTimeout) {
                clearTimeout(voiceTimeout);
            }
            voiceTimeout = setTimeout(() => {
                if (input.value.trim() && isListening) {
                    logRecognitionEvent('auto submit', 'Submitting after result timeout');
                    isListening = false;
                    document.getElementById('voiceInputToggle').removeAttribute('data-listening');
                    sendMessage();
                }
            }, VOICE_TIMEOUT_MS);
        }
    };

    recognition.onerror = (event) => {
        logRecognitionEvent('error', {
            error: event.error,
            message: event.message || 'No additional error details',
            timeStamp: event.timeStamp
        });

        resetVoiceInput();
        
        switch (event.error) {
            case 'not-allowed':
                if (!hasMicrophoneConsent) {
                    localStorage.setItem(STORAGE_KEYS.MICROPHONE_CONSENT, 'false');
                    alert('Microphone access was denied. Please enable microphone access in your browser settings.');
                }
                break;
            case 'network':
                alert('Unable to access speech recognition service. Please check your internet connection.');
                break;
            case 'no-speech':
                const input = document.getElementById('messageInput');
                input.placeholder = 'No speech detected. Try again...';
                setTimeout(() => {
                    input.placeholder = 'Ask your question...';
                }, 3000);
                break;
            case 'audio-capture':
                alert('No microphone was found. Please ensure your microphone is connected.');
                break;
            case 'aborted':
                logRecognitionEvent('info', 'Recognition manually stopped');
                break;
            default:
                logRecognitionEvent('warning', `Unhandled error type: ${event.error}`);
                if (autoListening) {
                    setTimeout(() => {
                        if (autoListening && !isListening && !isGenerating) {
                            toggleVoiceInput();
                        }
                    }, 1000);
                }
        }
    };

    recognition.onspeechend = () => {
        logRecognitionEvent('speech end', 'Speech ended');
        lastSpeechEndTime = Date.now();
    };

    recognition.onend = () => {
        if (voiceTimeout) {
            clearTimeout(voiceTimeout);
            voiceTimeout = null;
        }

        const input = document.getElementById('messageInput');
        const hasContent = input.value.trim().length > 0;

        logRecognitionEvent('end', {
            status: hasContent ? 'Recognition ended with content' : 'Recognition ended normally',
            wasListening: isListening,
            hasContent: hasContent,
            timeSinceLastSpeech: Date.now() - lastSpeechEndTime
        });

        if (hasContent && isListening) {
            logRecognitionEvent('auto submit', 'Submitting on recognition end');
            isListening = false;
            document.getElementById('voiceInputToggle').removeAttribute('data-listening');
            sendMessage();
        } else if (isListening) {
            resetVoiceInput();
            
            if (autoListening && !isGenerating && !hasContent) {
                logRecognitionEvent('info', 'Attempting to restart recognition');
                setTimeout(() => {
                    if (autoListening && !isListening && !isGenerating) {
                        toggleVoiceInput();
                    }
                }, 1000);
            }
        }
        
        // Only stop microphone if we're not in immersive mode
        if (!isImmersiveMode && microphoneStream) {
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;
        }
    };

    recognition.onspeechstart = () => {
        logRecognitionEvent('speech start', 'Speech detected');
        if (voiceTimeout) {
            clearTimeout(voiceTimeout);
            voiceTimeout = null;
        }
    };
}

function toggleAutoListening() {
    autoListening = !autoListening;
    const autoListenToggle = document.getElementById('autoListenToggle');
    
    if (autoListening) {
        autoListenToggle.classList.add('active');
        toggleImmersiveMode(); // Enter immersive mode
        if (!isListening && !isGenerating) {
            toggleVoiceInput();
        }
    } else {
        autoListenToggle.classList.remove('active');
        if (isListening) {
            recognition.stop();
        }
        toggleImmersiveMode(); // Exit immersive mode
    }
}

let isImmersiveMode = false;
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationFrame = null;
let microphoneStream = null;

function setupAudioAnalyzer() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.7;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

async function connectMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        microphoneStream = stream;
        return stream;
    } catch (err) {
        console.error('Error accessing microphone:', err);
        microphoneStream = null;
        return null;
    }
}

function createImmersiveUI() {
    const immersiveContainer = document.createElement('div');
    immersiveContainer.className = 'immersive-mode';
    immersiveContainer.innerHTML = `
        <div class="wave-container">
            <div class="wave-visualizer">
                ${Array(32).fill('<div class="wave-bar"></div>').join('')}
            </div>
            <div class="wave-status">Contemplating your question...</div>
        </div>
        <button class="exit-immersive">
            <img src="/static/icons/close-outline.svg" alt="Exit" class="icon">
            Exit Conversation Mode
        </button>
    `;
    
    document.body.appendChild(immersiveContainer);
    
    document.querySelector('.exit-immersive').addEventListener('click', toggleImmersiveMode);
}

function updateWaveform() {
    if (!isImmersiveMode) return;
    
    analyser.getByteFrequencyData(dataArray);
    const bars = document.querySelectorAll('.wave-bar');
    
    for (let i = 0; i < bars.length; i++) {
        const value = dataArray[i] || 0;
        const scaledHeight = Math.max(3, Math.min(60, value * 0.7));
        const smoothedHeight = (scaledHeight + parseFloat(bars[i].style.height || '3') * 2) / 3;
        bars[i].style.height = `${smoothedHeight}px`;
    }
    
    animationFrame = requestAnimationFrame(updateWaveform);
}

async function toggleImmersiveMode() {
    isImmersiveMode = !isImmersiveMode;
    
    if (isImmersiveMode) {
        setupAudioAnalyzer();
        document.body.classList.add('immersive');
        document.querySelector('.immersive-mode').classList.add('active');
        
        if (isListening) {
            await connectMicrophone();
        }
        
        updateWaveform();
    } else {
        document.body.classList.remove('immersive');
        document.querySelector('.immersive-mode').classList.remove('active');
        
        // Reset all button states
        if (isListening) {
            recognition.stop();
        }
        
        autoListening = false;
        
        const voiceInputToggle = document.getElementById('voiceInputToggle');
        const autoListenToggle = document.getElementById('autoListenToggle');
        
        voiceInputToggle.removeAttribute('data-listening');
        voiceInputToggle.classList.remove('active');
        autoListenToggle.classList.remove('active');
        
        // Clean up audio resources
        if (microphoneStream) {
            microphoneStream.getTracks().forEach(track => track.stop());
            microphoneStream = null;
        }
        
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    }
}

document.addEventListener('DOMContentLoaded', createImmersiveUI);

function setWaveThinkingState(isThinking) {
    const waveVisualizer = document.querySelector('.wave-visualizer');
    const waveStatus = document.querySelector('.wave-status');
    if (isThinking) {
        waveVisualizer.classList.add('thinking');
        waveStatus.style.opacity = '1';
        waveStatus.textContent = 'Contemplating your question...';
    } else {
        waveVisualizer.classList.remove('thinking');
        waveStatus.style.opacity = '0';
        waveStatus.textContent = '';
    }
}