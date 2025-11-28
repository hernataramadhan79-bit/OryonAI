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

// REUSABLE FORMATTING RULES FOR ALL AGENTS - GEMINI STRUCTURED STYLE
const COMMON_FORMATTING_RULES = `
    **FORMATTING GUIDELINES (STRICT GEMINI STYLE):**
    
    1.  **Headings & Sections:**
        *   Structure your response with clear sections.
        *   Use **H2 (##)** for major topics (e.g., "Overview", "Key Steps").
        *   Use **H3 (###)** for sub-points.
        *   Start with a brief introduction before the first heading.
    
    2.  **Lists & Bullets:**
        *   Use **Bullet points** for readability whenever listing items.
        *   Use **Numbered lists** for sequential steps.
        *   Ensure lists have space between items for clarity.
    
    3.  **Emphasis & Tone:**
        *   Use **Bold** for important terms or key takeaways.
        *   Keep paragraphs concise (2-3 sentences max).
        *   Maintain a helpful, professional, and clear tone.
    
    4.  **Data Presentation:**
        *   Use **Code Blocks** for any code or technical commands.
        *   Use **Markdown Tables** for comparisons or structured data.
        *   Use **Blockquotes (> text)** for notes, warnings, or key insights.
`;

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