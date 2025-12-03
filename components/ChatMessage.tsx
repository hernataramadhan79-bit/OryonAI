import React, { useState, memo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, Copy, Check, FileCode, RefreshCw, Eye, Code, Maximize2, Minimize2, Edit, Save } from 'lucide-react';
import TypingIndicator from './TypingIndicator';
import { getThemeHex } from '../utils/themeUtils';

interface ChatMessageProps {
  message: Message;
  agentTheme?: string;
  isLast?: boolean;
  onRegenerate?: () => void;
}

// Optimization: Memoize CodeBlock to prevent re-renders on parent updates
const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [isCopied, setIsCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize code state from children
  const originalCode = String(children).replace(/\n$/, '');
  const [currentCode, setCurrentCode] = useState(originalCode);

  // Sync state if props change (unlikely in chat but good practice)
  useEffect(() => {
    setCurrentCode(String(children).replace(/\n$/, ''));
  }, [children]);

  // Detect filename in the first line if it looks like a comment
  let fileName: string | null = null;
  
  // Logic to strip filename for display/execution if needed
  if (!inline) {
    const lines = currentCode.split('\n');
    const firstLine = lines[0]?.trim() || '';
    const fileNameMatch = firstLine.match(/^(?:\/\/|#|<!--|;)\s+([a-zA-Z0-9_\-\/.]+\.[a-zA-Z0-9]+)\s*(?:-->)?$/);
    
    if (fileNameMatch) {
      fileName = fileNameMatch[1];
    }
  }

  const isHTML = !inline && match && (match[1] === 'html' || match[1] === 'xml') && (fileName?.endsWith('.html') || currentCode.includes('<html'));

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentCode(e.target.value);
  };

  if (!inline && match) {
    return (
      <div className={`my-4 rounded-lg border border-white/10 bg-[#0d0d0d] shadow-md w-full max-w-full group font-sans ${isFullScreen ? 'fixed inset-0 z-[100] m-0 rounded-none h-screen flex flex-col' : 'overflow-hidden'}`}>
        
        {/* Header - IDE Tab Style */}
        <div className="bg-[#1a1a1a] px-3 py-2 flex items-center justify-between border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
             {/* Filename Tab */}
             {fileName ? (
                <div className="flex items-center gap-2 text-xs text-white font-medium bg-white/5 px-3 py-1 rounded-t-md border-t border-x border-white/10 -mb-[9px] relative z-10 truncate max-w-[150px]">
                   <FileCode size={12} className="text-blue-400 flex-shrink-0" />
                   <span className="truncate">{fileName}</span>
                </div>
             ) : (
                <span className="text-xs font-mono text-gray-500 font-bold uppercase tracking-wider">
                  {match[1]}
                </span>
             )}
          </div>

          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
             {/* Web Builder Controls */}
             {isHTML && (
               <>
                 {/* View Toggle */}
                 <button
                   onClick={() => {
                     setShowPreview(!showPreview);
                     if (showPreview) setIsFullScreen(false); // Exit FS if closing preview
                   }}
                   className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${showPreview ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-gray-400 hover:text-white'}`}
                   title="Toggle Preview"
                 >
                   {showPreview ? (
                     <>
                       <Code size={12} />
                       <span className="hidden sm:inline">Code</span>
                     </>
                   ) : (
                     <>
                       <Eye size={12} />
                       <span className="hidden sm:inline">Preview</span>
                     </>
                   )}
                 </button>

                 {/* Full Screen Toggle (Only in Preview) */}
                 {showPreview && (
                   <button
                     onClick={() => setIsFullScreen(!isFullScreen)}
                     className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${isFullScreen ? 'bg-cyber-accent/20 text-cyber-accent' : 'text-gray-400 hover:text-white'}`}
                     title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                   >
                     {isFullScreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                   </button>
                 )}
               </>
             )}

             {/* Edit Toggle (Only in Code View) */}
             {!showPreview && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${isEditing ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'text-gray-400 hover:text-white'}`}
                  title="Edit Code"
                >
                  {isEditing ? (
                    <>
                      <Save size={12} />
                      <span className="hidden sm:inline">Done</span>
                    </>
                  ) : (
                    <>
                      <Edit size={12} />
                      <span className="hidden sm:inline">Edit</span>
                    </>
                  )}
                </button>
             )}

             {/* Copy Button */}
             <button
               onClick={handleCopy}
               className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
               title="Copy Code"
             >
               {isCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
               <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`relative w-full ${isFullScreen ? 'flex-grow bg-[#0d0d0d]' : ''}`}>
           {showPreview ? (
             <div className="w-full h-full min-h-[400px] bg-white rounded-b-lg overflow-hidden">
                <iframe 
                  srcDoc={currentCode} 
                  title="Preview" 
                  className="w-full h-full border-none" 
                  sandbox="allow-scripts" // Basic safety
                />
             </div>
           ) : isEditing ? (
             <textarea 
               value={currentCode}
               onChange={handleCodeChange}
               className="w-full h-full min-h-[300px] bg-[#0d0d0d] text-gray-300 font-mono text-sm p-4 focus:outline-none resize-y"
               spellCheck={false}
             />
           ) : (
             <div className="p-4 overflow-x-auto custom-scrollbar bg-[#0d0d0d]">
               <code className={`font-mono text-sm leading-relaxed text-gray-300 block min-w-full ${className}`} {...props}>
                 {currentCode}
               </code>
             </div>
           )}
        </div>
      </div>
    );
  }

  // Inline Code
  return (
    <code className="bg-white/10 text-cyber-accent rounded px-1.5 py-0.5 text-sm font-mono break-all" {...props}>
      {children}
    </code>
  );
});

const ChatMessage: React.FC<ChatMessageProps> = ({ message, agentTheme, isLast, onRegenerate }) => {
  const isBot = message.role === 'model';
  const hexColor = getThemeHex(agentTheme);

  // Set CSS variables for this message
  const style = {
    '--agent-accent': hexColor,
  } as React.CSSProperties;

  return (
    <div 
      className={`flex w-full mb-6 md:mb-8 animate-fade-in-up group ${isBot ? 'justify-start' : 'justify-end'}`}
      style={style}
    >
      <div className={`flex gap-3 md:gap-4 max-w-[90%] md:max-w-[85%] lg:max-w-[80%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`
          w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-md border shadow-lg
          ${isBot 
            ? `bg-black/40 border-white/10 ${agentTheme || 'text-cyber-accent'} shadow-[0_4px_20px_rgba(0,0,0,0.3)]` 
            : 'bg-white/10 border-white/20 text-white'}
        `}>
          {isBot ? <Bot size={18} className="md:w-5 md:h-5" /> : <User size={18} className="md:w-5 md:h-5" />}
        </div>

        {/* Content Column - Added min-w-0 to fix flex overflow issues */}
        <div className={`flex flex-col gap-2 min-w-0 ${isBot ? 'items-start' : 'items-end'}`}>
          <div className="flex items-center gap-2 opacity-50 text-[10px] md:text-xs font-mono mb-1">
             <span>{isBot ? 'ORYON' : 'USER'}</span>
             <span>•</span>
             <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div 
            className={`
              relative px-4 py-3 md:px-6 md:py-5 rounded-2xl md:rounded-3xl backdrop-blur-md border shadow-md overflow-hidden text-sm md:text-[15px] leading-relaxed max-w-full
              ${isBot 
                ? 'bg-black/30 border-white/5 text-gray-200 rounded-tl-sm' 
                : 'bg-white/10 border-white/10 text-white rounded-tr-sm'}
              ${message.isStreaming ? 'border-t-white/10 border-l-white/10' : ''}
            `}
            style={isBot && message.isStreaming ? { 
                boxShadow: `inset 0 0 20px ${hexColor}1a, 0 4px 20px rgba(0,0,0,0.2)`
            } : {}}
          > 
            {/* Streaming Glow Effect (Top Border) */}
            {isBot && message.isStreaming && (
                <div 
                  className="absolute top-0 left-0 h-[1px] w-full animate-shimmer-slide opacity-50"
                  style={{ 
                    background: `linear-gradient(90deg, transparent, ${hexColor}, transparent)`,
                    zIndex: 10
                  }}
                />
            )}

            {/* Image Attachment (For User) */}
            {message.attachment && (
              <div className="mb-4 rounded-lg overflow-hidden border border-white/10 bg-black/50 max-w-sm">
                 <img 
                    src={message.attachment.data.startsWith('data:') ? message.attachment.data : `data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                    alt="Attachment" 
                    className="w-full h-auto object-cover max-h-[300px]" 
                 />
              </div>
            )}

            {/* Text Content */}
            {isBot && message.isStreaming && !message.text ? (
              <TypingIndicator themeColor={agentTheme} />
            ) : (
              <div className={`prose prose-invert w-full min-w-0 max-w-none break-words whitespace-pre-wrap
                 prose-p:leading-7 prose-p:my-3 
                 prose-headings:font-mono prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-6 prose-headings:mb-4
                 prose-h2:text-xl prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2 prose-h2:text-[var(--agent-accent)]
                 prose-h3:text-lg prose-h3:text-gray-200
                 prose-strong:text-white prose-strong:font-bold
                 prose-ul:my-4 prose-ul:pl-6 prose-ul:space-y-2 prose-li:marker:text-[var(--agent-accent)]
                 prose-ol:my-4 prose-ol:pl-6 prose-ol:space-y-2 prose-ol:marker:text-[var(--agent-accent)]
                 prose-blockquote:border-l-4 prose-blockquote:border-[var(--agent-accent)] prose-blockquote:bg-white/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-gray-400
                 prose-a:text-[var(--agent-accent)] prose-a:no-underline hover:prose-a:underline prose-a:break-all
                 prose-table:w-full prose-table:border-collapse prose-table:my-6 prose-table:rounded-lg prose-table:overflow-hidden prose-table:border prose-table:border-white/10
                 prose-thead:bg-white/5 prose-thead:text-xs prose-thead:uppercase prose-thead:tracking-wider prose-thead:text-[var(--agent-accent)]
                 prose-th:p-3 prose-th:text-left prose-th:font-bold prose-th:border-b prose-th:border-white/10
                 prose-td:p-3 prose-td:border-b prose-td:border-white/5 prose-td:text-sm prose-td:text-gray-300
                 prose-tr:last:border-0
              `}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock,
                    // Responsive Table Wrapper
                    table: ({node, ...props}) => (
                      <div className="w-full overflow-x-auto custom-scrollbar my-4 border border-white/10 rounded-lg">
                        <table {...props} className="w-full text-left border-collapse min-w-[500px]" />
                      </div>
                    )
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Regenerate Button (Only for last message if it's from bot and not streaming) */}
          {isLast && isBot && !message.isStreaming && onRegenerate && (
              <button 
                onClick={onRegenerate}
                className="self-start mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-white transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10"
              >
                  <RefreshCw size={10} />
                  <span>Regenerate</span>
              </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;