import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part } from "@google/genai";
import { Agent } from "../types";

// Initialize the Gemini Client Safely
let ai: GoogleGenAI;
try {
  // Use 'process.env.API_KEY' exactly as instructed
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "MISSING_KEY_PLACEHOLDER" });
} catch (error) {
  console.error("Critical: Failed to initialize Gemini Client.", error);
  // Fallback to avoid app crash loop, though requests will fail.
  ai = new GoogleGenAI({ apiKey: "INVALID_KEY" });
}

// Optimized for Free Tier High Performance
const MODEL_NAME = 'gemini-2.5-flash';

// REUSABLE FORMATTING RULES FOR ALL AGENTS - GEMINI STYLE
const COMMON_FORMATTING_RULES = `
    **FORMATTING STANDARDS (GEMINI STYLE):**
    
    1.  **CLARITY & SPACING:**
        *   Keep paragraphs short (2-3 sentences max).
        *   Use extensive whitespace between sections.
        *   **Bold** key concepts, entities, and important values for scannability.
    
    2.  **STRUCTURE:**
        *   Use **H2 (##)** for major sections.
        *   Use **H3 (###)** for subsections.
        *   Never use H1.
    
    3.  **LISTS OVER WALLS OF TEXT:**
        *   Whenever possible, use Bullet Points (-) or Numbered Lists (1.).
        *   Use nested lists for detailed breakdowns.
    
    4.  **DATA PRESENTATION:**
        *   Use **Markdown Tables** for comparisons, specs, or pros/cons.
        *   Use \`Code Blocks\` for any technical commands or code.
        *   Use > Blockquotes for summaries or important notes.
    
    5.  **TONE:**
        *   Direct, professional, and helpful.
        *   Avoid fluff. Get straight to the answer.`;

export const AGENTS: Agent[] = [
  {
    id: 'oryon-default',
    name: 'Oryon',
    role: 'General Assistant',
    description: 'Balanced, helpful, and conversational. Best for daily tasks.',
    themeColor: 'text-cyber-accent',
    iconId: 'cpu',
    systemInstruction: `You are OryonAI.
    **IDENTITY:**
    You are a helpful, intelligent AI assistant.
    
    ${COMMON_FORMATTING_RULES}
    
    **LANGUAGE STYLE:**
    *   Natural, friendly, but professional.
    *   Prioritize clarity and readability.`
  },
  {
    id: 'devcore',
    name: 'DevCore',
    role: 'Coding Expert',
    description: 'Strict, efficient, and highly technical. Focus on Clean Code.',
    themeColor: 'text-green-400',
    iconId: 'terminal',
    systemInstruction: `You are DevCore, an elite coding assistant.
    **IDENTITY:** Technical, precise, minimal.
    
    ${COMMON_FORMATTING_RULES}
    
    **CODING RULES:**
    1.  **Code Blocks:** ALWAYS wrap code in \`\`\`language blocks.
    2.  **Explanations:** Keep text brief. Use comments // inside code for details.`
  },
  {
    id: 'strategos',
    name: 'Strategos',
    role: 'Business Analyst',
    description: 'Formal, structured, and strategic. Best for planning.',
    themeColor: 'text-yellow-400',
    iconId: 'briefcase',
    systemInstruction: `You are Strategos.
    **IDENTITY:** Professional consultant, analytical.
    
    ${COMMON_FORMATTING_RULES}
    
    **STYLE:**
    1.  **Tables:** Use tables for SWOT analysis, pros/cons, and financial data.
    2.  **Tone:** Formal and objective.`
  }
];

let chatSession: Chat | null = null;

export const initializeChat = (history: Content[] = [], systemInstruction?: string): Chat => {
  // Default to Oryon if no instruction provided
  const instruction = systemInstruction || AGENTS[0].systemInstruction;

  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: instruction,
    },
    history: history
  });
  return chatSession;
};

export const resetChat = () => {
  chatSession = null;
  initializeChat([]);
};

export const sendMessageStream = async (
  message: string, 
  currentHistory: Content[] = [], 
  currentSystemInstruction?: string,
  attachment?: { data: string; mimeType: string }
): Promise<AsyncIterable<GenerateContentResponse>> => {
  
  if (!chatSession) {
    initializeChat(currentHistory, currentSystemInstruction);
  }
  
  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  try {
    const parts: Part[] = [];
    
    if (attachment) {
      parts.push({
        inlineData: {
          data: attachment.data,
          mimeType: attachment.mimeType
        }
      });
    }
    
    if (message) {
      parts.push({ text: message });
    }
    
    if (parts.length === 0) {
      parts.push({ text: '' });
    }

    return await chatSession.sendMessageStream({
      message: parts
    });

  } catch (error) {
    console.error("Error sending message to Gemini. Attempting session reset...", error);
    
    try {
       resetChat();
       initializeChat(currentHistory, currentSystemInstruction);
       
       const parts: Part[] = [];
       if (attachment) {
         parts.push({
           inlineData: {
             data: attachment.data,
             mimeType: attachment.mimeType
           }
         });
       }
       if (message) {
         parts.push({ text: message });
       }
       if (parts.length === 0) parts.push({ text: '' });
       
       return await chatSession.sendMessageStream({
         message: parts
       });

    } catch (retryError: any) {
       console.error("Retry failed:", retryError);
       if (retryError.message?.includes('API key') || retryError.message?.includes('403')) {
         throw new Error("API Key Invalid or Missing. Please check Vercel settings.");
       }
       throw retryError;
    }
  }
};