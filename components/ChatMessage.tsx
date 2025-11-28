import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, Copy, Check, FileCode, RefreshCw } from 'lucide-react';
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
  const codeString = String(children).replace(/\n$/, '');

  // Detect filename in the first line if it looks like a comment
  // Example matches: "// src/App.tsx", "# main.py", "<!-- index.html -->"
  let fileName: string | null = null;
  let displayCode = codeString;
  
  if (!inline) {
    const lines = codeString.split('\n');
    const firstLine = lines[0]?.trim() || '';
    
    // Regex to find comment-like structures containing a filename pattern (something.extension)
    const fileNameMatch = firstLine.match(/^(?:\/\/|#|<!--|;)\s+([a-zA-Z0-9_\-\/.]+\.[a-zA-Z0-9]+)\s*(?:-->)?$/);
    
    if (fileNameMatch) {
      fileName = fileNameMatch[1];
      // Remove the filename comment line from the displayed code to avoid redundancy
      displayCode = lines.slice(1).join('\n');
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode); // Copy only the code, not the filename comment if extracted
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d0d] shadow-md w-full max-w-full group font-sans">
        {/* Header - IDE Tab Style */}
        <div className="bg-[#1a1a1a] px-3 py-2 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
             {/* If filename detected, show it prominently like a tab */}
             {fileName ? (
                <div className="flex items-center gap-2 text-xs text-white font-medium bg-white/5 px-3 py-1 rounded-t-md border-t border-x border-white/10 -mb-[9px] relative z-10">
                   <FileCode size={12} className="text-blue-400" />
                   <span>{fileName}</span>
                </div>
             ) : (
                <span className="text-xs font-mono text-gray-500 font-bold uppercase tracking-wider">
                  {match[1]}
                </span>
             )}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            title="Copy Code"
          >
            {isCopied ? (
              <>
                <Check size={12} className="text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        
        {/* Code Area */}
        <div className="p-4 overflow-x-auto custom-scrollbar bg-[#0d0d0d]">
          <code className={className} {...props} style={{ fontSize: '13px', lineHeight: '1.6', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre' }}>
            {displayCode}
          </code>
        </div>
      </div>
    );
  }

  // Inline Code
  return (
    <code className="bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono text-gray-100 border border-white/5 break-all" {...props}>
      {children}
    </code>
  );
});

// Custom Table Renderer to ensure scrolling on mobile
const TableRenderer = ({ children, ...props }: any) => (
  <div className="w-full my-5 overflow-x-auto rounded-lg border border-white/10 shadow-sm bg-white/[0.02]">
    <table className="w-full border-collapse text-sm min-w-[500px]" {...props}>
      {children}
    </table>
  </div>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ message, agentTheme, isLast, onRegenerate }) => {
  const isUser = message.role === 'user';
  const isImage = message.type === 'image';
  
  // Derive styling based on role
  const themeColor = agentTheme || 'text-cyber-accent';
  const hexColor = getThemeHex(themeColor);

  // Determine animation class based on sender
  const animationClass = isUser ? 'animate-slide-in-right' : 'animate-slide-in-left';

  // Check if message is in "Thinking/Loading" state (AI role + empty text + no image)
  const isThinking = !isUser && !message.text && !message.imageUrl && !message.attachment;
  
  // Check if message is actively streaming
  const isStreaming = !!message.isStreaming;

  // CSS Variable for Agent Accent Color to be used in Prose
  const containerStyle = {
    '--agent-accent': hexColor,
  } as React.CSSProperties;

  return (
    <div 
      className={`flex w-full mb-4 md:mb-6 ${animationClass} ${isUser ? 'justify-end' : 'justify-start'}`}
      style={containerStyle}
    >
      
      <div className={`flex max-w-full md:max-w-[85%] gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`
          flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center border mt-1
          ${isUser 
            ? 'bg-white/5 border-white/10 text-gray-300' 
            : `bg-white/5 border-white/10 ${themeColor}`}
        `}>
          {isUser ? <User size={16} /> : <Bot size={18} />}
        </div>

        {/* Content Bubble */}
        <div className={`
          flex flex-col
          ${isUser ? 'items-end' : 'items-start'}
          min-w-0 w-full
        `}>
          <div 
            style={isStreaming && !isUser ? { 
              boxShadow: `0 0 10px ${hexColor}10`,
              borderColor: `${hexColor}40`
            } : {}}
            className={`
            group relative px-4 md:px-6 py-3 md:py-5 text-[15px] leading-relaxed transition-all duration-500 max-w-full
            ${isUser 
              ? 'bg-[#1e1e1e] text-gray-100 rounded-2xl rounded-tr-sm border border-white/10' 
              : `bg-transparent text-gray-100 rounded-none w-full`} 
            ${isImage ? 'p-0 bg-transparent border-none shadow-none w-fit' : ''}
          `}>
            
            {/* User Uploaded Attachment */}
            {message.attachment && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/30 shadow-lg inline-block">
                <img 
                  src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`} 
                  alt="Attachment" 
                  className="max-h-64 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {/* Generated Image Message (if enabled in future) */}
            {isImage && message.imageUrl ? (
              <div className="group/image relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl transition-transform duration-500">
                <img 
                  src={`data:image/jpeg;base64,${message.imageUrl}`} 
                  alt="Generated Art" 
                  className="w-full h-auto max-w-md object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}

            {/* Text Content OR Loading Indicator */}
            {(!isImage) && (
              <div className={`${(isImage || message.attachment) ? 'mt-4' : ''} ${!isUser ? 'w-full min-w-0' : ''}`}>
                 {isUser ? (
                  <p className="whitespace-pre-wrap font-sans break-words">{message.text}</p>
                ) : (
                   <>
                     {isThinking ? (
                        <TypingIndicator themeColor={agentTheme} />
                     ) : (
                       <div className="prose prose-invert prose-base max-w-none break-words
                         /* 
                            GEMINI-LIKE STRUCTURED TYPOGRAPHY 
                            Clean, readable, hierarchically strict.
                         */
                         
                         /* Body Text */
                         prose-p:text-gray-300 prose-p:leading-7 prose-p:mb-4 last:prose-p:mb-0
                         
                         /* Headings - Distinct and structured */
                         prose-headings:text-gray-100 prose-headings:font-medium prose-headings:scroll-mt-20
                         
                         /* H2 - Major Section */
                         prose-h2:text-xl prose-h2:mt-7 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
                         
                         /* H3 - Subsection */
                         prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-[var(--agent-accent)] prose-h3:font-semibold
                         
                         /* Lists - Clean with breathing room */
                         prose-ul:my-4 prose-ul:list-disc prose-ul:pl-4 prose-ul:text-gray-300 prose-ul:space-y-2
                         prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-4 prose-ol:text-gray-300 prose-ol:space-y-2
                         [&_li::marker]:text-[var(--agent-accent)] [&_li::marker]:font-bold
                         
                         /* Links */
                         prose-a:text-[var(--agent-accent)] prose-a:no-underline hover:prose-a:underline prose-a:break-all prose-a:font-medium
                         
                         /* Tables (Wrapper handled by Component) */
                         prose-thead:bg-white/5
                         prose-th:text-left prose-th:p-3 prose-th:text-gray-100 prose-th:font-semibold prose-th:border-b prose-th:border-r prose-th:border-white/10 last:prose-th:border-r-0
                         prose-td:p-3 prose-td:border-b prose-td:border-r prose-td:border-white/5 prose-td:text-gray-300 last:prose-td:border-r-0
                         prose-tr:hover:bg-white/[0.02]
                         
                         /* Blockquotes - Distinct Callout */
                         prose-blockquote:border-l-4 prose-blockquote:border-[var(--agent-accent)] prose-blockquote:bg-white/[0.03] prose-blockquote:pl-4 prose-blockquote:py-3 prose-blockquote:my-5 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-300 prose-blockquote:not-italic
                         
                         /* Strong/Bold */
                         prose-strong:text-white prose-strong:font-bold
                         
                         /* Horizontal Rule */
                         prose-hr:border-white/10 prose-hr:my-8
                         
                         /* Code Pre tag margin */
                         prose-pre:my-4
                       ">
                         <ReactMarkdown 
                           remarkPlugins={[remarkGfm]}
                           components={{
                             code: CodeBlock,
                             table: TableRenderer
                           }}
                         >
                           {message.text}
                         </ReactMarkdown>
                       </div>
                     )}
                   </>
                )}
              </div>
            )}
          </div>

          {/* Regenerate Button for Last Bot Message */}
          {isLast && !isUser && !isThinking && !isStreaming && onRegenerate && (
            <div className="flex items-center gap-2 mt-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
               <button 
                 onClick={onRegenerate}
                 className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md hover:bg-white/10 border border-transparent hover:border-white/10"
               >
                 <RefreshCw size={10} />
                 <span>Regenerate</span>
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ChatMessage);