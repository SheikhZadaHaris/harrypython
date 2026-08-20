class VoiceSystem {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.voiceEnabled = true;
    this.autoListen = false;
    this.language = 'en-US';
    this.onResult = null; // callback(transcript)
    this.onStatusChange = null; // callback(status)
    this.initRecognition();
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      return;
    }
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onresult = (event) => {
      let transcript = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      
      const lowerTranscript = transcript.toLowerCase();
      
      // If speaking, we ONLY listen for the wake/interruption word 'harry'.
      // If it doesn't contain 'harry', ignore it completely so he doesn't hear himself.
      if (this.isSpeaking) {
        if (lowerTranscript.includes('harry')) {
          this.stopSpeaking();
          this.updateStatus('Interrupted. Listening...');
          this.recognition.abort();
        }
        return;
      }

      if (isFinal && this.onResult) {
        // Double check to ensure we didn't just capture a final emission of self-speech
        if (!this.isSpeaking) {
          this.onResult(transcript);
        }
      }
      // Show interim results in UI
      if (!isFinal) {
        this.updateStatus('Hearing: ' + transcript);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateStatus('Click to speak');
      this.onStatusChange?.('idle');
      
      // Auto-listen mode: automatically start listening again if not speaking
      if (this.autoListen && !this.isSpeaking) {
        setTimeout(() => this.startListening(), 300);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.updateStatus('Voice error. Try again.');
      }
      this.onStatusChange?.('idle');
      
      // Try to recover autoListen if active
      if (this.autoListen && !this.isSpeaking && event.error !== 'not-allowed') {
        setTimeout(() => this.startListening(), 1000);
      }
    };
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    if (this.isSpeaking) {
      // Don't start listening if speaking unless requested by interruption
      return;
    }
    try {
      this.recognition.start();
      this.isListening = true;
      this.updateStatus('Listening...');
      this.onStatusChange?.('listening');
    } catch (e) {
      console.error('Start listening error:', e);
    }
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
    this.isListening = false;
    this.onStatusChange?.('idle');
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  speak(text) {
    if (!this.voiceEnabled || !this.synthesis) return;
    // Cancel any ongoing speech
    this.synthesis.cancel();

    // Clean text: strip emojis, markdown hashes (#), asterisks (*), backticks (`), and bullet lists
    let cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '') // strip emojis
      .replace(/[#*`_~\[\]()]+/g, ' ') // strip markdown formatting symbols
      .replace(/[-+•]{2,}/g, ' ') // strip bullet lists
      .replace(/\s+/g, ' ') // collapse whitespaces
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9; // Slightly slower rate makes Urdu sound much cleaner
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Detect if text contains Urdu characters
    const hasUrduChars = /[\u0600-\u06FF]/.test(cleanText);
    const voices = this.synthesis.getVoices();
    
    let preferredVoice = null;

    if (hasUrduChars) {
      // Direct Urdu matching (ur-PK, ur-IN)
      preferredVoice = voices.find(v => v.lang.startsWith('ur')) || 
                        voices.find(v => v.lang.includes('PK')) ||
                        voices.find(v => v.lang.startsWith('hi')); // Hindi uses same phonetic sounds
    } else {
      // Check if text sounds like Roman Urdu (basic heuristic for conversational Urdu words written in English letters)
      const romanUrduKeywords = /\b(main|hoon|hai|kya|aur|tum|aap|mein|haan|ji|shukriya|theek|bhai|he)\b/i;
      if (romanUrduKeywords.test(text)) {
        // Indian English or Hindi voices handle Roman Urdu accents far better than US/UK English voices
        preferredVoice = voices.find(v => v.lang === 'en-IN') || 
                          voices.find(v => v.lang.startsWith('hi')) || 
                          voices.find(v => v.lang.startsWith('ur'));
      }
    }

    // Default English fallbacks if no accent specific voice is found
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                       voices.find(v => v.lang.startsWith('en'));
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      // If using Hindi/Urdu voice for text translation, explicitly set lang
      if (preferredVoice.lang.startsWith('ur') || preferredVoice.lang.startsWith('hi')) {
        utterance.lang = preferredVoice.lang;
      }
    }

    // Turn off mic/listening before starting speech response
    this.stopListening();

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateStatus('Speaking...');
      this.onStatusChange?.('speaking');

      // Continuous wake-word listening: start recognition during output
      // to listen for "Harry" interruption trigger.
      if (this.autoListen) {
        try {
          // Temporarily enable recognition in the background to capture interruption
          this.recognition.start();
          this.isListening = true;
        } catch (e) {
          // ignore already started or block errors
        }
      }
    };
    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateStatus('Click to speak');
      this.onStatusChange?.('idle');
      
      // Clean start listening if autoListen is on
      if (this.autoListen) {
        // Ensure recognition is stopped first to start a fresh clean input turn
        this.stopListening();
        setTimeout(() => this.startListening(), 100);
      }
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
      this.onStatusChange?.('idle');
      
      if (this.autoListen) {
        this.stopListening();
        setTimeout(() => this.startListening(), 100);
      }
    };
    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) this.synthesis.cancel();
    this.isSpeaking = false;
  }

  updateStatus(text) {
    const el = document.getElementById('voiceStatus');
    if (el) el.textContent = text;
  }

  setLanguage(lang) {
    this.language = lang;
    if (this.recognition) this.recognition.lang = lang;
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
    if (!enabled) this.stopSpeaking();
  }

  setAutoListen(enabled) {
    this.autoListen = enabled;
  }
}

// Global instance
const voice = new VoiceSystem();
