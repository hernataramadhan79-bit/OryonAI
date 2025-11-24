import React, { useState, useEffect, useRef } from 'react';
import { GenerateContentResponse, Content, Part } from "@google/genai";
import { Sparkles, Trash2, AlertCircle, Database, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Message, User, Agent } from './types';
import { sendMessageStream, resetChat, generateImage, initializeChat, analyzeInputIntent, AGENTS } from './services/geminiService';
import { getSessionUser, logoutUser } from './services/authService';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  // Initialize state directly from storage to avoid flash of login screen
  // This synchronous check ensures the app renders the main UI immediately if logged in
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSessionUser());
  
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

  // Derived state for visibility: Visible if Pinned OR Hovered
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;

  // Load Memory (Multi-Agent)
  useEffect(() => {
    if (!currentUser) return;

    // Use a new key for the structured multi-agent memory
    const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
    const savedData = localStorage.getItem(userStorageKey);
    
    if (savedData) {
      try {
        const parsedStore: Record<string, Message[]> = JSON.parse(savedData);
        setHistoryStore(parsedStore);
        
        // Load messages for the default (or current) agent
        const agentMessages = parsedStore[currentAgent.id] || [];
        setMessages(agentMessages);
        
        // Initialize Gemini with this specific history
        initializeGeminiWithHistory(agentMessages, currentAgent.systemInstruction);
        
        if (agentMessages.length === 0) {
           setInitialWelcome(currentUser.displayName, currentAgent);
        }

      } catch (e) {
        console.error("Failed to load memory", e);
        setInitialWelcome(currentUser.displayName, currentAgent);
      }
    } else {
      setInitialWelcome(currentUser.displayName, currentAgent);
    }
    setIsMemoryLoaded(true);
  }, [currentUser]); // Run once on user load

  // Helper to re-init Gemini context
  const initializeGeminiWithHistory = (msgs: Message[], instruction: string) => {
    resetChat(); // Always clear previous context first
    
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
       // Update the store with the latest messages for the CURRENT agent
       const updatedStore = {
         ...historyStore,
         [currentAgent.id]: messages
       };
       
       const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
       localStorage.setItem(userStorageKey, JSON.stringify(updatedStore));
       
       // Update the Ref/State of store so switching agents gets latest data
       setHistoryStore(updatedStore);
    }
  }, [messages, currentUser, isMemoryLoaded, currentAgent.id]);

  const setInitialWelcome = (name: string, agent: Agent) => {
    // Generate a welcome message specific to the agent role
    let welcomeText = "";
    switch(agent.id) {
        case 'devcore': welcomeText = `DevCore System Online. Ready for code analysis. Target?`; break;
        case 'velocis': welcomeText = `Velocis Engine ignited. Ready to visualize or narrate your imagination.`; break;
        case 'strategos': welcomeText = `Strategos Module Active. Awaiting business data for analysis.`; break;
        default: welcomeText = `Hello ${name}, welcome back! OryonAI systems online. What is our objective today?`;
    }

    const welcomeMsg: Message = {
      id: 'welcome-' + uuidv4(),
      role: 'model',
      text: welcomeText,
      timestamp: Date.now(),
      isStreaming: false,
      type: 'text'
    };
    
    setMessages([welcomeMsg]);
    initializeChat([], agent.systemInstruction);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Note: isMemoryLoaded will be set to true by the useEffect monitoring currentUser
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setMessages([]);
    setHistoryStore({});
    setIsMemoryLoaded(false);
    resetChat();
  };

  // --- CORE AGENT SWITCHING LOGIC ---
  const handleAgentChange = (newAgent: Agent) => {
    if (newAgent.id === currentAgent.id) return;
    
    // 1. Force save current messages to the store before switching
    const updatedStore = {
        ...historyStore,
        [currentAgent.id]: messages
    };
    setHistoryStore(updatedStore); // Sync React state
    if (currentUser) {
        localStorage.setItem(`oryon_multi_agent_memory_${currentUser.username}`, JSON.stringify(updatedStore));
    }

    // 2. Load messages for the NEW agent
    const nextMessages = updatedStore[newAgent.id] || [];
    
    // 3. Update State
    setCurrentAgent(newAgent);
    setMessages(nextMessages);
    
    // 4. Re-Initialize Gemini Context for the new agent
    initializeGeminiWithHistory(nextMessages, newAgent.systemInstruction);

    // 5. If empty, trigger welcome
    if (nextMessages.length === 0) {
        setInitialWelcome(currentUser?.displayName || 'User', newAgent);
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

    // Build current history context
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

    const stream = await sendMessageStream(text, historyContext, currentAgent.systemInstruction, attachment);
    
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
  };

  const handleSendMessage = async (text: string, attachment?: { data: string; mimeType: string }) => {
    setError(null);
    
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
      let handled = false;

      // VELOCIS (Creative & Visual Engine) Logic
      if (currentAgent.id === 'velocis') {
         const intent = await analyzeInputIntent(text);

         if (intent === 'DRAW') {
            handled = true;
            const loadingMsg: Message = {
              id: aiMessageId,
              role: 'model',
              text: "Processing visual request...",
              timestamp: Date.now(),
              isStreaming: true,
              type: 'text'
            };
            setMessages((prev) => [...prev, loadingMsg]);

            const base64Image = await generateImage(text, attachment);

            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === aiMessageId 
                  ? { 
                      ...msg, 
                      text: "Art generated successfully.", 
                      imageUrl: base64Image,
                      type: 'image',
                      isStreaming: false 
                    } 
                  : msg
              )
            );
         }
      }

      if (!handled) {
        await handleChatFlow(text, aiMessageId, attachment);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "System Malfunction. Retry initiated.");
      setMessages((prev) => prev.filter(m => m.isStreaming !== true)); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (!currentUser) return;
    
    resetChat();
    
    // Clear ONLY the current agent's history in the store
    const updatedStore = {
        ...historyStore,
        [currentAgent.id]: []
    };
    
    setHistoryStore(updatedStore);
    const userStorageKey = `oryon_multi_agent_memory_${currentUser.username}`;
    localStorage.setItem(userStorageKey, JSON.stringify(updatedStore));

    setMessages([{
      id: uuidv4(),
      role: 'model',
      text: "Module memory cache cleared. Starting new session.",
      timestamp: Date.now(),
      type: 'text'
    }]);
    setError(null);
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Ensure memory is loaded before rendering the chat interface
  if (!isMemoryLoaded) return null;

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
      />

      {/* Main Content Wrapper - Shifts when sidebar is open */}
      <div 
        className={`flex-grow flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] relative`}
        style={{ paddingLeft: isSidebarOpen ? '20rem' : '0', willChange: 'padding-left' }}
      >
        {/* Header - Liquid Glass */}
        <header className={`
          fixed top-0 right-0 z-30 backdrop-blur-xl border-b h-20 flex items-center justify-between px-4 md:px-8 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          bg-cyber-black/60 border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.3)]
        `}
        style={{ width: isSidebarOpen ? 'calc(100% - 20rem)' : '100%', willChange: 'width' }}
        >
          
          <div className="flex items-center gap-4 md:gap-6">
            {/* Menu Button - Trigger Hover */}
            <button 
              onMouseEnter={() => setIsSidebarHovered(true)}
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
                <Sparkles className={`w-6 h-6 relative z-10 transition-colors duration-500 ${currentAgent.themeColor}`} />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-lg font-mono font-bold tracking-widest text-white leading-none drop-shadow-md">
                   {currentAgent.name.toUpperCase()}
                 </h1>
                 <span className={`text-[10px] font-mono tracking-[0.3em] transition-colors duration-500 ${currentAgent.themeColor}`}>
                   {currentAgent.role.toUpperCase()}
                 </span>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500 text-cyber-accent bg-cyber-accent/5 border-cyber-accent/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]">
              <Database size={12} />
              <span>MEM-LINK: {currentUser.username.toUpperCase()}</span>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-3 group cursor-default pl-4 border-l border-white/10">
                  <span className="hidden md:block text-sm font-medium text-gray-300 tracking-wide">
                    {currentUser.displayName}
                  </span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 bg-gradient-to-br from-white/10 to-white/5 border-white/10 text-white shadow-lg">
                    {currentUser.avatarInitials}
                  </div>
               </div>
               
               {/* Action Buttons - Liquid Glass */}
               <div className="flex gap-2">
                  <button onClick={handleClearChat} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/5 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 text-gray-400 transition-all duration-300 active:scale-90" title="Clear current session">
                     <Trash2 size={16} />
                  </button>
                  <button onClick={handleLogout} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white text-gray-400 transition-all duration-300 active:scale-90" title="Logout">
                     <LogOut size={16} />
                  </button>
               </div>
            </div>
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex-grow pt-28 pb-40 px-4 md:px-0 w-full max-w-4xl mx-auto relative z-0">
          {messages.map((msg) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              agentTheme={currentAgent.themeColor}
            />
          ))}

          {error && (
            <div className="flex items-center justify-center my-4 text-red-300 gap-2 p-4 bg-red-900/10 border border-red-500/20 rounded-2xl animate-fade-in-up mx-4 md:mx-0 backdrop-blur-md shadow-lg">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span className="text-xs font-mono uppercase tracking-wide">{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* Input Area */}
        <InputArea 
          onSend={handleSendMessage} 
          isLoading={isLoading} 
          isSidebarOpen={isSidebarOpen}
        />
      </div>
      
      {/* Dynamic Background FX */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden transition-all duration-1000">
        {/* Animated Gradient Orbs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] transition-all duration-1000 opacity-40 mix-blend-screen animate-pulse-slow ${currentAgent.themeColor.includes('text-pink') ? 'bg-pink-600/20' : currentAgent.themeColor.includes('text-green') ? 'bg-green-600/20' : 'bg-cyan-600/20'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] transition-all duration-1000 opacity-30 mix-blend-screen animate-pulse-slow ${currentAgent.themeColor.includes('text-pink') ? 'bg-purple-600/20' : 'bg-purple-900/30'}`} style={{ animationDelay: '2s' }}></div>
        
        {/* Subtle Noise Texture for depth */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>
    </div>
  );
};

export default App;