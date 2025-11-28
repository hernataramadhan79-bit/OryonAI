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
      <div className="my-4 rounded-lg overflow-hidden border border-white/10 bg-[#0d0d0d] shadow-md w-full max-w-full group">
        {/* Header Language Label */}
        <div className="bg-[#1a1a1a] px-3 py-1.5 flex items-center justify-between border-b border-white/5">
          <span className="text-xs font-sans text-gray-400 font-medium">
            {match[1]}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
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
        <div className="p-3 overflow-x-auto custom-scrollbar">
          <code className={className} {...props} style={{ fontSize: '13px', lineHeight: '1.5', fontFamily: 'monospace' }}>
            {children}
          </code>
        </div>
      </div>
    );
  }

  // Inline Code
  return (
    <code className="bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono text-gray-100 border border-white/5" {...props}>
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
            group relative px-4 md:px-5 py-3 md:py-4 text-[15px] leading-relaxed transition-all duration-500 max-w-full
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

            {/* Generated Image Message */}
            {isImage && message.imageUrl ? (
              <div className="group/image relative rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl transition-transform duration-500">
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
                  <p className="whitespace-pre-wrap font-sans">{message.text}</p>
                ) : (
                   <>
                     {isThinking ? (
                        <TypingIndicator themeColor={agentTheme} />
                     ) : (
                       <div className="prose prose-invert prose-base max-w-none
                         /* 
                            GEMINI-LIKE TYPOGRAPHY 
                            Refined for structure, clarity, and modern aesthetics.
                         */
                         
                         /* Body Text */
                         prose-p:text-gray-300 prose-p:leading-7 prose-p:mb-4 last:prose-p:mb-0
                         
                         /* Headings */
                         prose-headings:text-gray-100 prose-headings:font-semibold prose-headings:scroll-mt-20
                         prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
                         prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-[var(--agent-accent)]
                         
                         /* Lists */
                         prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5 prose-ul:text-gray-300 prose-ul:space-y-1
                         prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5 prose-ol:text-gray-300 prose-ol:space-y-1
                         [&_li::marker]:text-[var(--agent-accent)]
                         
                         /* Links */
                         prose-a:text-[var(--agent-accent)] prose-a:no-underline hover:prose-a:underline
                         
                         /* Tables (Clean Data Grid) */
                         prose-table:w-full prose-table:my-5 prose-table:border-collapse prose-table:text-sm prose-table:rounded-lg prose-table:overflow-hidden prose-table:border prose-table:border-white/10
                         prose-thead:bg-white/5
                         prose-th:text-left prose-th:p-3 prose-th:text-gray-100 prose-th:font-semibold prose-th:border-b prose-th:border-r prose-th:border-white/10 last:prose-th:border-r-0
                         prose-td:p-3 prose-td:border-b prose-td:border-r prose-td:border-white/5 prose-td:text-gray-300 last:prose-td:border-r-0
                         prose-tr:hover:bg-white/[0.02]
                         
                         /* Blockquotes */
                         prose-blockquote:border-l-4 prose-blockquote:border-[var(--agent-accent)] prose-blockquote:bg-white/[0.02] prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:rounded-r prose-blockquote:text-gray-400 prose-blockquote:italic
                         
                         /* Strong/Bold */
                         prose-strong:text-white prose-strong:font-bold
                         
                         /* Horizontal Rule */
                         prose-hr:border-white/10 prose-hr:my-6
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
        </div>
      </div>
    </div>
  );
};

export default memo(ChatMessage);