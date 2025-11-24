import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Paperclip, Trash2, Check, ScanLine, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { LanguageCode, LanguageDefinition } from '../types';
import { SUPPORTED_LANGUAGES, getTranslation } from '../utils/translations';
import { getThemeHex } from '../utils/themeUtils';

interface InputAreaProps {
  onSend: (text: string, attachment?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
  isSidebarPinned: boolean;
  isSpeechEnabled: boolean;
  onToggleSpeech: () => void;
  currentLanguage: LanguageCode;
  agentTheme?: string;
}

const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
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
        
        // DYNAMIC LANGUAGE SETTING
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
  }, [currentLanguage, currentLangDef.voiceCode]); // Re-initialize when language changes

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Voice input is not supported in this browser. Try Chrome or Edge.");
        return;
    }

    // Ensure lang is updated before starting
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
        textareaRef.current.style.height = '40px'; // Reset to base height
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
      // Safety check for file size (e.g. 10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Maximum size is 10MB.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const result = event.target?.result;
          if (typeof result === 'string') {
            // Robustly extract base64 data
            const parts = result.split(',');
            if (parts.length >= 2) {
              const base64Data = parts[1];
              setAttachment({
                data: base64Data,
                mimeType: file.type,
                preview: result
              });
            } else {
              throw new Error("Invalid file format");
            }
          }
        } catch (err) {
          console.error("Error processing file:", err);
          alert("Failed to process image. Please try another file.");
        }
      };

      reader.onerror = () => {
        console.error("Error reading file");
        alert("Error reading file.");
      };

      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 40), 150);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  return (
    <div 
      className={`fixed bottom-0 right-0 z-20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        w-full ${isSidebarPinned ? 'md:w-[calc(100%-20rem)]' : 'md:w-full'}
        pb-[env(safe-area-inset-bottom)] bg-cyber-black/80 backdrop-blur-md
      `}
    >
      {/* Gradient Fade for seamless scroll feel - Positioned above the container */}
      <div className="absolute -top-32 left-0 w-full h-32 bg-gradient-to-t from-cyber-black via-cyber-black/90 to-transparent pointer-events-none"></div>

      <div className="relative w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
          
          {/* Attachment HUD Preview */}
          {attachment && (
            <div className="mb-4 animate-fade-in-up origin-bottom">
              <div className="relative w-full max-w-md mx-auto">
                <div className="relative rounded-2xl overflow-hidden bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] group">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg z-20" style={{ borderColor: `${hexColor}80` }}></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg z-20" style={{ borderColor: `${hexColor}80` }}></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg z-20" style={{ borderColor: `${hexColor}80` }}></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-lg z-20" style={{ borderColor: `${hexColor}80` }}></div>
                  
                  <div className="relative p-1 bg-white/5">
                     <div className="relative rounded-lg overflow-hidden bg-cyber-black/50 min-h-[150px] max-h-[250px] flex items-center justify-center">
                       <img src={attachment.preview} alt="Preview" className="relative z-10 w-full h-full object-contain max-h-[250px]" />
                     </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between p-3 border-t border-white/10 bg-white/5">
                     <div className="flex items-center gap-2 px-2" style={{ color: hexColor }}>
                        <ScanLine size={14} className="animate-pulse" />
                        <span className="text-[9px] font-mono tracking-[0.2em] uppercase">{t.visualReady}</span>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setAttachment(null)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95">
                          <Trash2 size={12} />
                          <span className="text-[10px] font-bold tracking-wide">{t.discard}</span>
                        </button>
                        <button 
                          onClick={() => handleSubmit()} 
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all active:scale-95"
                          style={{ 
                            backgroundColor: `${hexColor}1a`, // 10% opacity
                            borderColor: `${hexColor}33`, // 20% opacity
                            color: hexColor
                          }}
                        >
                          <Check size={12} />
                          <span className="text-[10px] font-bold tracking-wide">{t.send}</span>
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Input Container */}
          <div 
            className={`
              relative flex items-end gap-2 p-1.5 rounded-[26px] backdrop-blur-2xl border transition-all duration-500
              ${isFocused || isListening
                ? 'bg-white/10 border-white/20' 
                : 'bg-white/5 border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}
            `}
            style={isFocused || isListening ? { boxShadow: `0 0 40px ${hexColor}26` } : {}}
          >
            
            {/* Top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"></div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*" 
              className="hidden" 
            />

            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`
                w-10 h-10 rounded-full flex-shrink-0 transition-all duration-300
                flex items-center justify-center
                text-gray-400 hover:text-white hover:bg-white/10 active:scale-95
                disabled:opacity-50
              `}
              title="Attach image"
            >
              <Paperclip size={20} />
            </button>

            {/* TTS Toggle Button */}
            <button
              onClick={onToggleSpeech}
              className={`
                w-10 h-10 rounded-full flex-shrink-0 transition-all duration-300
                flex items-center justify-center active:scale-95
                ${isSpeechEnabled ? 'hover:bg-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
              `}
              style={isSpeechEnabled ? { color: hexColor } : {}}
              title={isSpeechEnabled ? "Bot Voice: ON" : "Bot Voice: OFF"}
            >
              {isSpeechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

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
              className={`
                flex-grow bg-transparent focus:outline-none resize-none font-sans text-[15px] transition-colors duration-300
                text-gray-100 placeholder-gray-500
                custom-scrollbar
                leading-[20px] py-[10px] min-h-[40px]
              `}
              style={{ caretColor: hexColor }}
              rows={1}
            />

            {/* Voice Input Button */}
            <button
              onClick={toggleListening}
              className={`
                w-10 h-10 rounded-full flex-shrink-0 transition-all duration-300
                flex items-center justify-center active:scale-95
                ${isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'}
              `}
              title={`Voice Input (${currentLangDef.name})`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Send Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={(!input.trim() && !attachment) || isLoading}
              className={`
                w-10 h-10 rounded-full flex-shrink-0 transition-all duration-500 ease-out overflow-hidden
                flex items-center justify-center relative group
                ${(!input.trim() && !attachment) || isLoading 
                  ? 'bg-white/5 text-gray-600 opacity-50 cursor-not-allowed scale-95' 
                  : 'bg-white/10 hover:bg-white/20 active:scale-90'}
              `}
              style={(!input.trim() && !attachment) || isLoading ? {} : { color: hexColor, boxShadow: `0 0 20px ${hexColor}33` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${hexColor}33 0%, transparent 70%)` }}></div>
              <SendHorizontal size={20} className={`relative z-10 transition-transform duration-500 ${(!input.trim() && !attachment) || isLoading ? '' : 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'}`} />
            </button>
          </div>
          
          {/* Footer Text */}
          <div className="text-center mt-3 opacity-60">
             <p className="text-[9px] font-mono tracking-[0.3em] text-gray-600 drop-shadow-sm">
               {t.madeBy}
             </p>
          </div>
      </div>
    </div>
  );
};

export default InputArea;