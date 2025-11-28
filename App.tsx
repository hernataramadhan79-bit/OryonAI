import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GenerateContentResponse, Content, Part } from "@google/genai";
import { Trash2, AlertCircle, LogOut, Menu, Cpu, Terminal, Briefcase, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Message, User, Agent, LanguageCode } from './types';
import { sendMessageStream, resetChat, initializeChat, getAgents } from './services/geminiService';
import { getSessionUser, logoutUser } from './services/authService';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import { getTranslation, getSystemLanguageInstruction, SUPPORTED_LANGUAGES } from './utils/translations';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSessionUser());
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  
  useEffect(() => {
    if (currentUser && currentUser.language) {
      setCurrentUser(prev => prev ? ({...prev, language: currentUser.language}) : null);
      setCurrentLanguage(currentUser.language);
    }
  }, [currentUser]);

  // Dynamic Agents based on Language
  const agents = useMemo(() => getAgents(currentLanguage), [currentLanguage]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [historyStore, setHistoryStore] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMemoryLoaded, setIsMemoryLoaded] = useState(false);
  const stopGenerationRef = useRef(false);
  
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  
  // Initialize with the first agent from the dynamic list
  const [currentAgent, setCurrentAgent] = useState<Agent>(agents[0]);

  // SYNC AGENT CONTENT WHEN LANGUAGE CHANGES
  useEffect(() => {
    // When agents list updates (due to lang change), find the current agent by ID in the new list
    const updatedAgent = agents.find(a => a.id === currentAgent.id) || agents[0];
    setCurrentAgent(updatedAgent);
  }, [agents]); // Dependency on 'agents' which depends on 'currentLanguage'

  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;
  const t = getTranslation(currentLanguage);

  // Helper to combine agent instruction with language instruction
  const getFullSystemInstruction = (agentInstruction: string, lang: LanguageCode) => {
    return agentInstruction + getSystemLanguageInstruction(lang);
  };

  useEffect(() => {
    let isMounted = true;
    if (!currentUser) {
      setIsMemoryLoaded(false);
      return;
    }

    const loadMemory = async () => {
      try {
        const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
        const savedData = localStorage.getItem(userStorageKey);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return;

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
        if (isMounted) setInitialWelcome(currentUser.displayName, currentAgent);
      } finally {
        if (isMounted) {
          setIsMemoryLoaded(true);
        }
      }
    };

    setIsMemoryLoaded(false);
    loadMemory();

    return () => {
      isMounted = false;
    };
  }, [currentUser]); 

  useEffect(() => {
    if (isMemoryLoaded && messages.length > 0) {
      // Re-initialize chat with new language instruction AND new agent instruction
      initializeGeminiWithHistory(messages, getFullSystemInstruction(currentAgent.systemInstruction, currentLanguage));
    }
  }, [currentLanguage, currentAgent]); // Re-init if language or agent (translated) changes

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
         if (m.text) parts.push({ text: m.text });
         
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

  useEffect(() => {
    if (currentUser && isMemoryLoaded) {
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

  const speakText = (text: string) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const langDef = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);
    const targetVoiceCode = langDef?.voiceCode || 'en-US';

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
    setIsMemoryLoaded(false);
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
    
    if (window.innerWidth < 768) {
      setIsSidebarPinned(false);
      setIsSidebarHovered(false);
    }
  };

  const handleChatFlow = async (text: string, aiMessageId: string, attachment?: { data: string; mimeType: string }) => {
    stopGenerationRef.current = false;
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
         if (m.text) parts.push({ text: m.text });
         
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
      if (stopGenerationRef.current) {
          break;
      }
      const chunkText = (chunk as GenerateContentResponse).text;
      if (chunkText) {
        accumulatedText += chunkText;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
          )
        );
      }
    }

    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
      )
    );

    if (!stopGenerationRef.current) {
        speakText(accumulatedText);
    }
  };

  const handleSendMessage = async (text: string, attachment?: { data: string; mimeType: string }) => {
    setError(null);
    window.speechSynthesis.cancel();
    
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
      await handleChatFlow(text, aiMessageId, attachment);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.errorGeneric);
      setMessages((prev) => prev.filter(m => m.isStreaming !== true)); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopGeneration = () => {
    stopGenerationRef.current = true;
    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length === 0) return;
    
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'user') return; // Can't regenerate if last msg is user (should wait for bot)

    // Find the last user message to resend
    let lastUserMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
            lastUserMsgIndex = i;
            break;
        }
    }

    if (lastUserMsgIndex === -1) return;

    const lastUserMsg = messages[lastUserMsgIndex];
    
    // Remove all messages after the last user message (inclusive if we want to re-add it, or just keep it and clear bot response)
    // Actually, typically we just remove the bot's failed/bad response and keep the user's message, then trigger send again.
    
    // Remove the bot response
    setMessages(prev => prev.slice(0, lastUserMsgIndex + 1));
    
    setIsLoading(true);
    try {
        const aiMessageId = uuidv4();
        await handleChatFlow(lastUserMsg.text, aiMessageId, lastUserMsg.attachment);
    } catch (err: any) {
        setError(err.message || t.errorGeneric);
        setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (!currentUser) return;
    window.speechSynthesis.cancel();
    resetChat();
    
    const updatedStore = { ...historyStore, [currentAgent.id]: [] };
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

  const handleExportChat = () => {
    const chatContent = messages.map(m => {
        const role = m.role === 'user' ? currentUser?.displayName.toUpperCase() : currentAgent.name.toUpperCase();
        return `[${new Date(m.timestamp).toLocaleString()}] ${role}:\n${m.text}\n`;
    }).join('\n-------------------\n\n');

    const blob = new Blob([chatContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oryon-chat-${currentAgent.id}-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    <div key={currentUser.username} className="min-h-screen flex flex-col font-sans bg-cyber-black text-gray-200 overflow-hidden selection:bg-cyber-accent selection:text-black transition-colors duration-500">
      <Sidebar 
        isOpen={isSidebarOpen} 
        isPinned={isSidebarPinned}
        onPinToggle={() => setIsSidebarPinned(!isSidebarPinned)}
        onHoverStart={() => setIsSidebarHovered(true)}
        onHoverEnd={() => setIsSidebarHovered(false)}
        onClose={() => { setIsSidebarPinned(false); setIsSidebarHovered(false); }}
        agents={agents}
        currentAgent={currentAgent}
        onSelectAgent={handleAgentChange}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
      />

      {/* External Overlay removed; managed internally by Sidebar now */}

      <div 
        className={`flex-grow flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] relative
          ${isSidebarPinned ? 'md:pl-80' : 'pl-0'} 
        `}
      >
        <header className={`
          fixed top-0 right-0 z-30 backdrop-blur-xl border-b h-20 flex items-center justify-between px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          bg-cyber-black/60 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]
          w-full ${isSidebarPinned ? 'md:w-[calc(100%-20rem)]' : 'md:w-full'}
        `}>
          <div className="flex items-center gap-3 md:gap-6">
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

          <div className="flex items-center gap-3 md:gap-4">
            {messages.length > 0 && (
              <>
                 <button
                    onClick={handleExportChat}
                    className="p-2 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    title="Export Chat"
                 >
                    <Download size={16} />
                 </button>
                 <button
                    onClick={handleClearChat}
                    className="p-2 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
                    title={t.clearChat}
                 >
                    <Trash2 size={16} />
                 </button>
              </>
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

        <main className="flex-grow overflow-y-auto overflow-x-hidden px-3 md:px-8 pt-24 pb-48 md:pb-32 custom-scrollbar flex flex-col items-center">
            <div className="w-full max-w-3xl">
               {messages.map((msg, index) => (
                 <ChatMessage 
                   key={msg.id} 
                   message={msg} 
                   agentTheme={currentAgent.themeColor}
                   isLast={index === messages.length - 1}
                   onRegenerate={handleRegenerate}
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

        <InputArea 
          onSend={handleSendMessage} 
          onStop={handleStopGeneration}
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