import React, { memo } from 'react';
import { ChevronsLeft, Globe, Terminal, Briefcase, Cpu } from 'lucide-react';
import { Agent, LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, getTranslation } from '../utils/translations';

interface SidebarProps {
  isOpen: boolean; 
  isPinned: boolean;
  onPinToggle: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClose: () => void; // Added for explicit mobile close action
  agents: Agent[];
  currentAgent: Agent;
  onSelectAgent: (agent: Agent) => void;
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
}

const getIcon = (iconId: string) => {
  switch (iconId) {
    case 'terminal': return <Terminal size={20} />;
    case 'briefcase': return <Briefcase size={20} />;
    default: return <Cpu size={20} />;
  }
};

interface AgentItemProps {
  agent: Agent;
  isActive: boolean;
  onClick: () => void;
}

const AgentItem: React.FC<AgentItemProps> = memo(({ agent, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full text-left relative group p-3 md:p-4 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden
      border transform-gpu flex-shrink-0
      ${isActive 
        ? `bg-white/10 border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md translate-x-2` 
        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 hover:backdrop-blur-sm hover:shadow-lg'}
      active:scale-[0.97]
    `}
  >
    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 ease-in-out transform translate-x-[-100%] group-hover:translate-x-[100%] pointer-events-none`}></div>
    
    <div className="relative z-10 flex items-start gap-3 md:gap-4">
      <div className={`
        p-2.5 md:p-3 rounded-xl flex items-center justify-center transition-all duration-500
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]
        ${isActive 
          ? `bg-gradient-to-br from-white/10 to-white/5 ${agent.themeColor} shadow-[0_0_15px_rgba(var(--color),0.3)]` 
          : 'bg-white/5 text-gray-500 group-hover:text-gray-200 group-hover:bg-white/10'}
      `}>
        {getIcon(agent.iconId)}
      </div>

      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-center mb-0.5 md:mb-1">
          <h3 className={`font-bold text-sm tracking-wide transition-colors duration-300 truncate pr-2 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
            {agent.name}
          </h3>
          {isActive && (
            <div className={`relative w-2 h-2 flex-shrink-0`}>
               <div className={`absolute inset-0 rounded-full ${agent.themeColor.replace('text-', 'bg-')} animate-ping opacity-75`}></div>
               <div className={`relative rounded-full w-2 h-2 ${agent.themeColor.replace('text-', 'bg-')}`}></div>
            </div>
          )}
        </div>
        <p className={`text-xs font-medium mb-1 transition-colors duration-300 truncate ${isActive ? 'text-gray-300' : 'text-gray-600 group-hover:text-gray-400'}`}>
          {agent.role}
        </p>
      </div>
    </div>
  </button>
));

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  isPinned, 
  onPinToggle,
  onHoverStart,
  onHoverEnd,
  onClose,
  agents, 
  currentAgent, 
  onSelectAgent, 
  currentLanguage,
  onLanguageChange
}) => {
  const t = getTranslation(currentLanguage);

  return (
    <>
      {/* Mobile Overlay / Backdrop - Click here to close sidebar */}
      <div 
        className={`
          md:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm 
          transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      <div 
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        className={`
          fixed top-0 left-0 h-full z-[60] 
          w-[85vw] max-w-[320px] md:w-80
          bg-cyber-black/95 backdrop-blur-2xl border-r border-white/5
          shadow-[20px_0_50px_rgba(0,0,0,0.3)] 
          transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
        style={{ willChange: 'transform' }}
      >
        {/* Header Area */}
        <div className="flex-shrink-0">
          {/* Title Bar */}
          <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center relative overflow-hidden h-20">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            
            <h2 className="text-lg md:text-xl font-mono font-bold text-white tracking-[0.2em] relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              NEURAL LINK
            </h2>
            
            {/* Back Button (Replaces Pin Button) */}
            <button 
              onClick={onClose}
              className="p-2 rounded-full transition-all duration-300 active:scale-90 text-gray-500 hover:text-white hover:bg-white/5"
              title="Close Menu"
            >
              <ChevronsLeft size={24} />
            </button>
          </div>

          {/* Language Selector */}
          <div className="px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-2 text-gray-500 text-[10px] font-mono uppercase tracking-widest">
              <Globe size={10} />
              <span>Language Interface</span>
            </div>
            <div className="grid grid-cols-2 gap-2"> 
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
                  className={`
                    px-1 py-1.5 rounded-lg text-[10px] md:text-xs font-medium flex items-center justify-center gap-1 transition-all
                    ${currentLanguage === lang.code 
                      ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/30' 
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white'}
                  `}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Agent List Area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 md:p-6 min-h-0 flex flex-col">
          <p className="text-[10px] font-mono text-gray-500 mb-2 md:mb-4 uppercase tracking-widest pl-2 opacity-70 flex-shrink-0">
            {t.selectModel}
          </p>
          
          <div className="space-y-2 md:space-y-3 flex-grow">
            {agents.map((agent) => (
              <AgentItem 
                key={agent.id} 
                agent={agent} 
                isActive={currentAgent.id === agent.id} 
                onClick={() => onSelectAgent(agent)} 
              />
            ))}
          </div>
          
          <div className="mt-6 md:mt-8 p-4 rounded-3xl bg-gradient-to-b from-white/5 to-transparent border border-white/5 relative overflow-hidden group flex-shrink-0">
            <div className="absolute inset-0 bg-white/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <p className="text-[10px] text-gray-500 text-center font-mono relative z-10 tracking-widest">
              {t.systemStatus}: <span className="text-green-400 shadow-green-400/50 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">{t.online}</span>
            </p>
          </div>
        </div>

        {/* Footer Credit (Fixed at bottom) */}
        <div className="flex-shrink-0 p-6 border-t border-white/5 bg-black/40 backdrop-blur-md z-10">
          <p className="text-[10px] font-mono text-center text-gray-600 tracking-widest uppercase hover:text-cyber-accent transition-colors duration-300 cursor-default">
            Made By Hernata FTIG
          </p>
        </div>
      </div>
    </>
  );
};

export default memo(Sidebar);