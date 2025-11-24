import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, Download, Copy, Check } from 'lucide-react';
import TypingIndicator from './TypingIndicator';
import { getThemeHex } from '../utils/themeUtils';

interface ChatMessageProps {
  message: Message;
  agentTheme?: string;
}

// Optimization: Memoize CodeBlock to prevent re-renders on parent updates
const CodeBlock = memo(({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '');
  const [isCopied, setIsCopied] = useState(false);
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="my-6 rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-sm shadow-xl w-full max-w-full group transition-all duration-300 hover:border-white/20">
        {/* Header Language Label */}
        <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-bold">
            {match[1]}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            {isCopied ? (
              <>
                <Check size={12} className="text-green-400" />
                <span className="text-green-400">COPIED</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>COPY</span>
              </>
            )}
          </button>
        </div>
        
        {/* Code Area */}
        <div className="p-4 overflow-x-auto custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }

  // Inline Code
  return (
    <code className="bg-white/10 px-1.5 py-0.5 rounded-md text-sm font-mono text-gray-200 border border-white/10" {...props}>
      {children}
    </code>
  );
});

const ChatMessage: React.FC<ChatMessageProps> = ({ message, agentTheme }) => {
  const isUser = message.role === 'user';
  const isImage = message.type === 'image';
  
  // Derive styling based on role
  const themeColor = agentTheme || 'text-cyber-accent';
  const borderColor = themeColor.replace('text-', 'border-');
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
      className={`flex w-full mb-8 md:mb-10 ${animationClass} ${isUser ? 'justify-end' : 'justify-start'}`}
      style={containerStyle}
    >
      
      <div className={`flex max-w-full md:max-w-[85%] gap-2 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar - Glassy */}
        <div className={`
          flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center border backdrop-blur-xl mt-1 transition-all duration-500 shadow-lg group
          ${isUser 
            ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10' 
            : `bg-white/5 border-white/10 ${themeColor} hover:bg-white/10`}
        `}>
          {isUser ? <User size={16} className="md:w-[18px] md:h-[18px]" /> : <Bot size={16} className="md:w-[18px] md:h-[18px]" />}
        </div>

        {/* Content Bubble */}
        <div className={`
          flex flex-col
          ${isUser ? 'items-end' : 'items-start'}
          min-w-0 w-full
        `}>
          <div 
            style={isStreaming && !isUser ? { 
              boxShadow: `0 0 15px ${hexColor}15`,
              borderColor: `${hexColor}50`
            } : {}}
            className={`
            group relative px-4 md:px-5 py-3 md:py-4 text-[14px] md:text-[15px] leading-relaxed transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] max-w-full backdrop-blur-xl shadow-sm
            ${isUser 
              ? 'bg-white/10 text-gray-100 rounded-[1.25rem] md:rounded-[1.5rem] rounded-tr-sm border border-white/10 w-fit' 
              : `bg-black/40 text-gray-200 rounded-[1.25rem] md:rounded-[1.5rem] rounded-tl-sm border border-white/5 border-l-2 ${borderColor} w-full`} 
            ${isImage ? 'p-0 bg-transparent border-none shadow-none w-fit !backdrop-blur-0' : ''}
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

            {/* Generated Image Message */}
            {isImage && message.imageUrl ? (
              <div className="group/image relative rounded-[1.5rem] overflow-hidden border border-white/10 bg-black/50 shadow-2xl transition-transform duration-500">
                <img 
                  src={`data:image/jpeg;base64,${message.imageUrl}`} 
                  alt="Generated Art" 
                  className="w-full h-auto max-w-md object-cover"
                  loading="lazy"
                />
                <div className="absolute top-3 right-3 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
                  <a 
                    href={`data:image/jpeg;base64,${message.imageUrl}`} 
                    download={`oryon-art-${message.id}.jpg`}
                    className="bg-black/60 hover:bg-white/20 hover:text-white text-gray-200 p-2.5 rounded-xl backdrop-blur-xl border border-white/10 transition-all flex items-center justify-center active:scale-90"
                    title="Download"
                  >
                    <Download size={20} />
                  </a>
                </div>
              </div>
            ) : null}

            {/* Text Content OR Loading Indicator */}
            {(!isImage) && (
              <div className={`${(isImage || message.attachment) ? 'mt-4' : ''} ${!isUser ? 'w-full' : ''}`}>
                 {isUser ? (
                  <p className="whitespace-pre-wrap font-sans font-medium tracking-wide">{message.text}</p>
                ) : (
                   <>
                     {isThinking ? (
                        <TypingIndicator themeColor={agentTheme} />
                     ) : (
                       <div className="prose prose-invert prose-sm max-w-none
                         /* Typography Updates for Structured Response */
                         
                         /* Paragraphs */
                         prose-p:text-gray-300 prose-p:leading-7 prose-p:mb-4 last:prose-p:mb-0 prose-p:font-sans
                         
                         /* Headings - Enhanced Visuals */
                         prose-headings:text-white prose-headings:font-bold prose-headings:font-mono prose-headings:mt-8 prose-headings:mb-4 prose-headings:pb-2 prose-headings:border-b prose-headings:border-white/10
                         prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h3:text-[var(--agent-accent)] prose-h3:border-none
                         
                         /* Lists - Colored Markers using Dynamic CSS Var */
                         prose-ul:my-4 prose-ul:list-disc prose-ul:pl-4 prose-ul:text-gray-300 prose-ul:space-y-2
                         prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-4 prose-ol:text-gray-300 prose-ol:space-y-2
                         [&_li::marker]:text-[var(--agent-accent)]
                         
                         /* Links */
                         prose-a:text-[var(--agent-accent)] prose-a:underline prose-a:decoration-[var(--agent-accent)]/30 hover:prose-a:text-white hover:prose-a:decoration-white
                         
                         /* Table Styling - Tech Data Grid */
                         prose-table:w-full prose-table:my-6 prose-table:border-collapse prose-table:text-sm prose-table:bg-white/5 prose-table:rounded-lg prose-table:overflow-hidden
                         prose-thead:bg-white/5 prose-thead:border-b prose-thead:border-white/10
                         prose-th:text-left prose-th:p-3 prose-th:text-[var(--agent-accent)] prose-th:font-bold prose-th:uppercase prose-th:tracking-wider prose-th:text-[10px] prose-th:font-mono
                         prose-td:p-3 prose-td:border-b prose-td:border-white/5 prose-td:text-gray-300
                         
                         /* Blockquote */
                         prose-blockquote:border-l-2 prose-blockquote:border-[var(--agent-accent)] prose-blockquote:bg-white/5 prose-blockquote:pl-4 prose-blockquote:py-3 prose-blockquote:my-4 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-400 prose-blockquote:italic
                         
                         /* Strong/Bold */
                         prose-strong:text-white prose-strong:font-bold
                         
                         /* HR */
                         prose-hr:border-white/10 prose-hr:my-8
                       ">
                         <ReactMarkdown 
                           remarkPlugins={[remarkGfm]}
                           components={{
                             code: CodeBlock
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
          
          {/* Timestamp */}
          {!isUser && (
            <span className="text-[9px] text-gray-600 mt-2 ml-2 font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(ChatMessage);