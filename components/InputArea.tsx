import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, Check, ScanLine, Mic, MicOff, Volume2, VolumeX, Trash2, Square } from 'lucide-react';
import { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, getTranslation } from '../utils/translations';
import { getThemeHex } from '../utils/themeUtils';

interface InputAreaProps {
  onSend: (text: string, attachment?: { data: string; mimeType: string }) => void;
  onStop: () => void;
  isLoading: boolean;
  isSidebarPinned: boolean;
  isSpeechEnabled: boolean;
  onToggleSpeech: () => void;
  currentLanguage: LanguageCode;
  agentTheme?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  onStop,
  isLoading, 
  isSidebarPinned,
  isSpeechEnabled,
  onToggleSpeech,
  currentLanguage,
  agentTheme
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ data: string; mimeType: string; preview: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const t = getTranslation(currentLanguage);
  const currentLangDef = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];
  const hexColor = getThemeHex(agentTheme);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = currentLangDef.voiceCode;

        recognitionRef.current.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            setInput(transcript);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };
    }
  }, [currentLanguage, currentLangDef.voiceCode]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Voice input is not supported in this browser.");
        return;
    }
    recognitionRef.current.lang = currentLangDef.voiceCode;

    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    } else {
        recognitionRef.current.start();
        setIsListening(true);
        setIsFocused(true);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachment) && !isLoading) {
      onSend(input, attachment ? { data: attachment.data, mimeType: attachment.mimeType } : undefined);
      setInput('');
      setAttachment(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px'; 
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Max 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const result = event.target?.result;
          if (typeof result === 'string') {
            const parts = result.split(',');
            if (parts.length >= 2) {
              setAttachment({
                data: parts[1],
                mimeType: file.type,
                preview: result
              });
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Enforce minimum height of 40px to match buttons
      const newHeight = Math.min(Math.max(scrollHeight, 40), 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  return (
    <div 
      className={`fixed bottom-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        w-full ${isSidebarPinned ? 'md:w-[calc(100%-20rem)]' : 'md:w-full'}
        pb-[calc(env(safe-area-inset-bottom)+10px)] bg-transparent pointer-events-none
      `}
    >
      {/* Input Container Wrapper for Floating Effect - Pointer events auto to re-enable interaction */}
      <div className="relative w-full max-w-5xl mx-auto px-4 md:px-4 pointer-events-auto">
          
          {/* Attachment Preview */}
          {attachment && (
            <div className="mb-3 animate-fade-in-up origin-bottom">
              <div className="relative w-full max-w-sm mx-auto">
                <div className="relative rounded-2xl overflow-hidden bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl group">
                  <div className="relative p-1 bg-white/5">
                     <div className="relative rounded-lg overflow-hidden bg-cyber-black/50 min-h-[120px] max-h-[200px] flex items-center justify-center">
                       <img src={attachment.preview} alt="Preview" className="relative z-10 w-full h-full object-contain max-h-[200px]" />
                     </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 border-t border-white/10 bg-white/5">
                     <div className="flex items-center gap-2 px-2" style={{ color: hexColor }}>
                        <ScanLine size={14} className="animate-pulse" />
                        <span className="text-[10px] font-mono tracking-widest uppercase">READY</span>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setAttachment(null)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => handleSubmit()} className="p-2 rounded-lg border transition-all active:scale-95 bg-white/5 hover:bg-white/10 text-white border-white/10">
                          <Check size={14} />
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Input Bar */}
          <div 
            className={`
              relative flex items-end gap-1 md:gap-2 p-1 md:p-1.5 rounded-[28px] backdrop-blur-2xl border transition-all duration-500
              mx-auto shadow-[0_4px_30px_rgba(0,0,0,0.5)]
              ${isFocused || isListening ? 'bg-black/80 border-white/30' : 'bg-black/60 border-white/10'}
            `}
            style={isFocused || isListening ? { boxShadow: `0 0 30px ${hexColor}1a`, borderColor: `${hexColor}50` } : {}}
          >
            
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

            {/* Left Actions */}
            <div className="flex items-center gap-0.5">
                <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                title="Attach"
                >
                <Paperclip size={20} />
                </button>

                <button
                onClick={onToggleSpeech}
                className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all ${isSpeechEnabled ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                style={isSpeechEnabled ? { color: hexColor } : {}}
                >
                {isSpeechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
            </div>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isListening ? t.listening : t.messagePlaceholder}
              disabled={isLoading}
              className="flex-grow bg-transparent focus:outline-none resize-none font-sans text-[15px] text-gray-100 placeholder-gray-500 custom-scrollbar leading-[20px] py-[10px] min-h-[40px]"
              style={{ caretColor: hexColor }}
              rows={1}
            />

            {/* Right Actions */}
            <div className="flex items-center gap-1">
                <button
                onClick={toggleListening}
                className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {isLoading ? (
                  <button
                  onClick={onStop}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-red-500/20 text-red-500 hover:bg-red-500/30 active:scale-90 border border-red-500/30"
                  title="Stop Generation"
                  >
                  <Square size={16} fill="currentColor" />
                  </button>
                ) : (
                  <button
                  onClick={() => handleSubmit()}
                  disabled={(!input.trim() && !attachment)}
                  className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 relative group overflow-hidden
                      ${(!input.trim() && !attachment)
                      ? 'bg-white/5 text-gray-600 opacity-50 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20 active:scale-90'}
                  `}
                  style={(!input.trim() && !attachment) ? {} : { color: hexColor, backgroundColor: `${hexColor}15` }}
                  >
                  <SendHorizontal size={20} className={(!input.trim() && !attachment) ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform'} />
                  </button>
                )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default InputArea;