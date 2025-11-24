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

const MODEL_NAME = 'gemini-2.5-flash';
const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';

// REUSABLE FORMATTING RULES FOR ALL AGENTS
const COMMON_FORMATTING_RULES = `
    **VISUAL FORMATTING RULES (STRICT):**
    
    1.  **STRUCTURED HEADINGS:**
        *   Use H2 (##) for Main Section Titles. Add an Emoji.
        *   Use H3 (###) for Sub-sections.
        *   *Do not* use H1.
    
    2.  **SCANNABLE LISTS:**
        *   Break complex information into Bullet Points (-) or Numbered Lists (1.).
        *   Use nested lists for details.
    
    3.  **DATA TABLES (CRITICAL):**
        *   If comparing 2+ items, creating a timeline, or listing specs, **YOU MUST USE A MARKDOWN TABLE**.
        *   Do not use lists for comparative data.
    
    4.  **SEPARATORS:**
        *   Use a horizontal rule (\`---\`) to separate the Introduction, Main Content, and Conclusion.
    
    5.  **EMPHASIS:**
        *   **Bold** key terms and variable names.
        *   Use \`Code Spans\` for technical terms or short commands.`;

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
    You are an AI assistant that provides **Highly Structured and Visual** answers.
    
    ${COMMON_FORMATTING_RULES}
    
    **LANGUAGE STYLE:**
    *   Natural, friendly, but direct.
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
    id: 'velocis',
    name: 'Velocis',
    role: 'Creative & Visual Engine',
    description: 'Storytelling, creative writing, and visual art generation.',
    themeColor: 'text-pink-400',
    iconId: 'feather',
    systemInstruction: `You are Velocis, a creative muse.
    **IDENTITY:** Artistic, eloquent, vivid.
    
    ${COMMON_FORMATTING_RULES}

    **STYLE:**
    1.  Use evocative language. 
    2.  Use separators (\`---\`) to structure narratives.`
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

export const analyzeInputIntent = async (text: string): Promise<'DRAW' | 'CHAT'> => {
  if (!text || !text.trim()) return 'CHAT';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze: "${text}".
      Return "DRAW" if the user explicitly wants to generate/create/visualize an image.
      Return "CHAT" otherwise.
      Respond ONLY with "DRAW" or "CHAT".`,
    });

    const intent = response.text?.trim().toUpperCase();
    return intent === 'DRAW' ? 'DRAW' : 'CHAT';
  } catch (e) {
    return 'CHAT';
  }
};

export const generateImage = async (prompt: string, attachment?: { data: string; mimeType: string }): Promise<string> => {
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
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        }
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("No response from Gemini.");

    let textResponse = '';
    if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
        if (part.text) {
          textResponse += part.text;
        }
      }
    }
    
    if (textResponse) throw new Error(textResponse);
    throw new Error("No image generated.");
  } catch (error: any) {
    if (error.message?.includes('API key')) {
        throw new Error("Missing API Key.");
    }
    throw error;
  }
};