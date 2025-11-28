import React, { useState, useEffect, useRef } from 'react';
import { GenerateContentResponse, Content, Part } from "@google/genai";
import { Trash2, AlertCircle, LogOut, Menu, Cpu, Terminal, Briefcase } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Message, User, Agent, LanguageCode } from './types';
import { sendMessageStream, resetChat, initializeChat, AGENTS } from './services/geminiService';
import { getSessionUser, logoutUser } from './services/authService';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import { getTranslation, getSystemLanguageInstruction, SUPPORTED_LANGUAGES } from './utils/translations';

const App: React.FC = () => {
  // Initialize state directly from storage to avoid flash of login screen
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSessionUser());
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  
  // Sync language with user profile on load
  useEffect(() => {
    if (currentUser && currentUser.language) {
      setCurrentUser(prev => prev ? ({...prev, language: currentUser.language}) : null);
      setCurrentLanguage(currentUser.language);
    }
  }, [currentUser]);

  // State for the CURRENT active conversation
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State to hold ALL histories: { 'oryon-default': [...], 'devcore': [...] }
  const [historyStore, setHistoryStore] = useState<Record<string, Message[]>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMemoryLoaded, setIsMemoryLoaded] = useState(false);
  
  // Agent State
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent>(AGENTS[0]);

  // Voice/TTS State
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);

  // Responsive Sidebar Logic
  // isOpen: Controls Visibility (Slide in/out) -> Includes Hover
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;
  
  // Translations
  const t = getTranslation(currentLanguage);

  // Helper to combine agent instruction with language instruction
  const getFullSystemInstruction = (agentInstruction: string, lang: LanguageCode) => {
    return agentInstruction + getSystemLanguageInstruction(lang);
  };

  // Load Memory (Multi-Agent) - ROBUST IMPLEMENTATION
  useEffect(() => {
    if (!currentUser) return;

    // Async function to handle memory loading safely
    const loadMemory = async () => {
      try {
        const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
        const savedData = localStorage.getItem(userStorageKey);
        
        if (savedData) {
          const parsedStore: Record<string, Message[]> = JSON.parse(savedData);
          setHistoryStore(parsedStore);
          
          const agentMessages = parsedStore[currentAgent.id] || [];
          setMessages(agentMessages);
          
          initializeGeminiWithHistory(agentMessages, getFullSystemInstruction(currentAgent.systemInstruction, currentLanguage));
          
          if (agentMessages.length === 0) {
             setInitialWelcome(currentUser.displayName, currentAgent);
          }
        } else {
          setInitialWelcome(currentUser.displayName, currentAgent);
        }
      } catch (e) {
        console.error("Failed to load memory", e);
        // Fallback if memory load fails
        setInitialWelcome(currentUser.displayName, currentAgent);
      } finally {
        // CRITICAL: Always unblock the UI after a short delay for smoothness
        setTimeout(() => {
          setIsMemoryLoaded(true);
        }, 800);
      }
    };

    loadMemory();
    
  }, [currentUser]); // Depend ONLY on currentUser to prevent re-loops

  // Update system instruction when language changes
  useEffect(() => {
    if (isMemoryLoaded && messages.length > 0) {
      // Re-initialize chat with new language instruction but keep history
      initializeGeminiWithHistory(messages, getFullSystemInstruction(currentAgent.systemInstruction, currentLanguage));
    }
  }, [currentLanguage]);

  // Helper to re-init Gemini context
  const initializeGeminiWithHistory = (msgs: Message[], instruction: string) => {
    resetChat(); 
    
    const validHistory: Content[] = [];
    msgs.forEach(m => {
      if (m.type === 'text' && !m.isStreaming) {
         const parts: Part[] = [];
         if (m.attachment) {
           parts.push({
             inlineData: {
               data: m.attachment.data,
               mimeType: m.attachment.mimeType
             }
           });
         }
         if (m.text) {
           parts.push({ text: m.text });
         }
         
         if (parts.length > 0) {
            validHistory.push({
              role: m.role,
              parts: parts
            });
         }
      }
    });
    
    initializeChat(validHistory, instruction);
  };

  // Save Memory (Update Store when Messages Change)
  useEffect(() => {
    if (currentUser && isMemoryLoaded) {
       // PERFORMANCE FIX: Don't write to localStorage while streaming (high frequency updates)
       // Wait until the message is finished (isStreaming = false)
       const lastMsg = messages[messages.length - 1];
       if (lastMsg && lastMsg.isStreaming) return;

       const updatedStore = {
         ...historyStore,
         [currentAgent.id]: messages
       };
       
       const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
       localStorage.setItem(userStorageKey, JSON.stringify(updatedStore));
       
       setHistoryStore(updatedStore);
    }
  }, [messages, currentUser, isMemoryLoaded, currentAgent.id]);

  // Speech Synthesis Helper
  const speakText = (text: string) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    
    // Cancel previous speech
    window.speechSynthesis.cancel();

    // Clean text for speech (remove markdown symbols roughly)
    const cleanText = text.replace(/[*_#`]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Select voice based on language code
    const voices = window.speechSynthesis.getVoices();
    const langDef = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);
    const targetVoiceCode = langDef?.voiceCode || 'en-US';

    // Try to find exact match first (e.g. id-ID), then language match (e.g. id), then fallback to Google US
    const preferredVoice = 
      voices.find(v => v.lang === targetVoiceCode) || 
      voices.find(v => v.lang.startsWith(currentLanguage)) || 
      voices.find(v => v.name.includes('Google US English'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    }

    window.speechSynthesis.speak(utterance);
  };

  const setInitialWelcome = (name: string, agent: Agent) => {
    const welcomeText = `Hello ${name}, ${agent.name} ${t.aiWelcome}`;

    const welcomeMsg: Message = {
      id: 'welcome-' + uuidv4(),
      role: 'model',
      text: welcomeText,
      timestamp: Date.now(),
      isStreaming: false,
      type: 'text'
    };
    
    setMessages([welcomeMsg]);
    initializeChat([], getFullSystemInstruction(agent.systemInstruction, currentLanguage));
    
    // Optionally speak welcome message if enabled (default off though)
    if (isSpeechEnabled) speakText(welcomeText);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.language) {
      setCurrentLanguage(user.language);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setMessages([]);
    setHistoryStore({});
    setIsMemoryLoaded(false);
    resetChat();
    window.speechSynthesis.cancel();
  };

  const handleAgentChange = (newAgent: Agent) => {
    if (newAgent.id === currentAgent.id) return;
    window.speechSynthesis.cancel();

    const updatedStore = {
        ...historyStore,
        [currentAgent.id]: messages
    };
    setHistoryStore(updatedStore); 
    if (currentUser) {
        localStorage.setItem(`oryon_multi_agent_memory_${currentUser.username}`, JSON.stringify(updatedStore));
    }

    const nextMessages = updatedStore[newAgent.id] || [];
    
    setCurrentAgent(newAgent);
    setMessages(nextMessages);
    
    initializeGeminiWithHistory(nextMessages, getFullSystemInstruction(newAgent.systemInstruction, currentLanguage));

    if (nextMessages.length === 0) {
        setInitialWelcome(currentUser?.displayName || 'User', newAgent);
    }
    
    // Mobile UX: Close sidebar after selection
    if (window.innerWidth < 768) {
      setIsSidebarPinned(false);
      setIsSidebarHovered(false);
    }
  };

  const handleChatFlow = async (text: string, aiMessageId: string, attachment?: { data: string; mimeType: string }) => {
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      type: 'text'
    };

    setMessages((prev) => [...prev, initialAiMessage]);

    const historyContext: Content[] = [];
    messages.forEach(m => {
       if (m.type === 'text' && !m.isStreaming) {
         const parts: Part[] = [];
         if (m.attachment) {
           parts.push({
             inlineData: {
               data: m.attachment.data,
               mimeType: m.attachment.mimeType
             }
           });
         }
         if (m.text) {
           parts.push({ text: m.text });
         }
         
         if (parts.length > 0) {
            historyContext.push({
              role: m.role,
              parts: parts
            });
         }
       }
    });

    const stream = await sendMessageStream(
      text, 
      historyContext, 
      getFullSystemInstruction(currentAgent.systemInstruction, currentLanguage), 
      attachment
    );
    
    let accumulatedText = '';

    for await (const chunk of stream) {
      const chunkText = (chunk as GenerateContentResponse).text;
      if (chunkText) {
        accumulatedText += chunkText;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === aiMessageId 
              ? { ...msg, text: accumulatedText } 
              : msg
          )
        );
      }
    }

    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === aiMessageId 
              ? { ...msg, isStreaming: false } 
              : msg
      )
    );

    // Speak the final text
    speakText(accumulatedText);
  };

  const handleSendMessage = async (text: string, attachment?: { data: string; mimeType: string }) => {
    setError(null);
    window.speechSynthesis.cancel(); // Stop any current speaking
    
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      text,
      timestamp: Date.now(),
      type: 'text',
      attachment: attachment 
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const aiMessageId = uuidv4();
      
      // Removed Analyze Intent & Draw Logic for Optimization
      await handleChatFlow(text, aiMessageId, attachment);

    } catch (err: any) {
      console.error(err);
      setError(err.message || t.errorGeneric);
      setMessages((prev) => prev.filter(m => m.isStreaming !== true)); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (!currentUser) return;
    window.speechSynthesis.cancel();
    resetChat();
    
    const updatedStore = {
        ...historyStore,
        [currentAgent.id]: []
    };
    
    setHistoryStore(updatedStore);
    const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
    localStorage.setItem(userStorageKey, JSON.stringify(updatedStore));

    const clearMsg = t.aiClear;
    setMessages([{
      id: uuidv4(),
      role: 'model',
      text: clearMsg,
      timestamp: Date.now(),
      type: 'text'
    }]);
    if (isSpeechEnabled) speakText(clearMsg);
    setError(null);
  };

  // Helper for dynamic header icon
  const getHeaderIcon = (iconId: string) => {
    const className = `w-6 h-6 relative z-10 transition-colors duration-500 ${currentAgent.themeColor}`;
    switch (iconId) {
      case 'terminal': return <Terminal className={className} />;
      case 'briefcase': return <Briefcase className={className} />;
      default: return <Cpu className={className} />;
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // FIX: Glitch Prevention. 
  // Return a stable dark loading screen.
  if (!isMemoryLoaded) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center animate-fade-in-up">
        <div className="relative flex flex-col items-center gap-4">
           <div className="relative">
             <div className="w-16 h-16 rounded-full border-2 border-cyber-accent/20 border-t-cyber-accent animate-spin"></div>
             <div className="absolute inset-0 bg-cyber-accent/10 blur-xl animate-pulse"></div>
           </div>
           <span className="text-cyber-accent font-mono text-xs tracking-[0.3em] animate-pulse">INITIALIZING</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-cyber-black text-gray-200 overflow-hidden selection:bg-cyber-accent selection:text-black transition-colors duration-500">
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        isPinned={isSidebarPinned}
        onPinToggle={() => setIsSidebarPinned(!isSidebarPinned)}
        onHoverStart={() => setIsSidebarHovered(true)}
        onHoverEnd={() => setIsSidebarHovered(false)}
        agents={AGENTS}
        currentAgent={currentAgent}
        onSelectAgent={handleAgentChange}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />

      {/* Overlay backdrop for mobile when sidebar is open */}
      <div 
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => { setIsSidebarPinned(false); setIsSidebarHovered(false); }}
      ></div>

      {/* Main Content Wrapper */}
      <div 
        className={`flex-grow flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] relative
          ${isSidebarPinned ? 'md:pl-80' : 'pl-0'} 
        `}
      >
        {/* Header */}
        <header className={`
          fixed top-0 right-0 z-30 backdrop-blur-xl border-b h-20 flex items-center justify-between px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          bg-cyber-black/60 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]
          w-full ${isSidebarPinned ? 'md:w-[calc(100%-20rem)]' : 'md:w-full'}
        `}>
          
          <div className="flex items-center gap-3 md:gap-6">
            {/* Menu Button */}
            <button 
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300
                ${isSidebarPinned 
                  ? 'bg-white/20 border-white/30 text-white shadow-glow' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'}
              `}
            >
              <Menu size={20} />
            </button>

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <div className={`absolute inset-0 blur-xl opacity-60 animate-pulse-slow ${currentAgent.themeColor.replace('text-', 'bg-')}`}></div>
                {getHeaderIcon(currentAgent.iconId)}
              </div>
              <div className="flex flex-col">
                 <h1 className="text-base md:text-lg font-mono font-bold tracking-widest text-white leading-none drop-shadow-md">
                   {currentAgent.name.toUpperCase()}
                 </h1>
                 <span className={`text-[9px] md:text-[10px] font-mono tracking-[0.3em] transition-colors duration-500 ${currentAgent.themeColor}`}>
                   {currentAgent.role.toUpperCase()}
                 </span>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 md:gap-4">
            
            {/* Clear Chat Button (Moved from floating) */}
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-2 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
                title={t.clearChat}
              >
                <Trash2 size={16} />
              </button>
            )}

            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-gray-400">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
               <span className="tracking-widest">{currentUser.username.toUpperCase()}</span>
            </div>

            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 text-xs font-bold text-cyber-accent">
               {currentUser.avatarInitials}
            </div>
            
            <button 
               onClick={handleLogout}
               className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
               title={t.logout}
            >
               <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Chat Area - Adjusted padding for mobile */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden px-3 md:px-8 pt-24 pb-48 md:pb-32 custom-scrollbar flex flex-col items-center">
            <div className="w-full max-w-3xl">
               {messages.map((msg) => (
                 <ChatMessage 
                   key={msg.id} 
                   message={msg} 
                   agentTheme={currentAgent.themeColor}
                 />
               ))}
               
               {isLoading && !messages.some(m => m.isStreaming) && (
                 <div className="flex justify-start w-full mb-8 animate-fade-in-up">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 mr-4 ${currentAgent.themeColor}`}>
                       <Cpu size={16} className="animate-spin-slow" />
                    </div>
                 </div>
               )}
               
               {error && (
                 <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 mb-6 animate-pulse">
                    <AlertCircle size={20} />
                    <span className="text-sm font-mono">{error}</span>
                 </div>
               )}

               <div ref={messagesEndRef} />
            </div>
        </main>

        {/* Input Area */}
        <InputArea 
          onSend={handleSendMessage} 
          isLoading={isLoading}
          isSidebarPinned={isSidebarPinned}
          isSpeechEnabled={isSpeechEnabled}
          onToggleSpeech={() => setIsSpeechEnabled(!isSpeechEnabled)}
          currentLanguage={currentLanguage}
          agentTheme={currentAgent.themeColor}
        />

      </div>
    </div>
  );
};

export default App;