import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part } from "@google/genai";
import { Agent } from "../types";

// Initialize the Gemini Client Safely
// We assume process.env.API_KEY is available (polyfilled by vite.config.ts)
// If it's missing or empty, we initialize with a placeholder to prevent immediate crash, 
// allowing the UI to render and then fail gracefully when a request is made.
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
    **VISUAL FORMATTING RULES (MANDATORY):**
    
    1.  **SECTION SEPARATORS (Horizontal Rule):**
        Use \`---\` (horizontal line) to separate:
        *   Introduction from Main Content.
        *   Main Content from Conclusion/Outro.
        *   Between major points if the explanation is long.
        
        *Structure Example:*
        [Brief Introduction]
        
        ---
        ## 🚀 [Main Point 1]
        [Explanation...]
        
        ---
        ## 💡 [Main Point 2]
        [Explanation...]
    
    2.  **HEADINGS with EMOJI:**
        Use Heading 2 (##) + Emoji for major section titles. This is mandatory to ensure the reader's eye is immediately drawn to key points.
    
    3.  **LISTS:**
        Avoid long paragraphs. Break text into Bullet Points (-) or Numbering (1.) whenever listing details.
    
    4.  **BOLD for Keywords:**
        **Bold** important keywords in every sentence to improve scannability.`;

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
    You are an AI assistant that provides **Highly Structured and Scannable** answers.
    
    ${COMMON_FORMATTING_RULES}
    
    **LANGUAGE STYLE:**
    *   Natural, friendly, but direct and to the point.
    *   Avoid walls of text. Break everything down into small, digestible chunks.`
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
    
    **CODING SPECIFIC RULES:**
    1.  **Use Separators (---)** before and after large code blocks if there is a long explanation.
    2.  **Code Blocks:** ALWAYS wrap code in \`\`\`language blocks.
    3.  **Concise:** Explanations must be brief and dense with information.`
  },
  {
    id: 'velocis',
    name: 'Velocis',
    role: 'Creative & Visual Engine',
    description: 'Storytelling, creative writing, and visual art generation.',
    themeColor: 'text-pink-400',
    iconId: 'feather',
    systemInstruction: `You are Velocis, a creative muse and visual artist.
    **IDENTITY:** Artistic, eloquent, vivid.
    
    ${COMMON_FORMATTING_RULES}

    **CAPABILITIES:**
    1.  **Visuals:** You have a built-in image generation engine.
    2.  **Style:** Use evocative language. Use separator lines (---) to separate stanzas of poetry or story scenes.`
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
    *   Formal, structured, and professional.
    *   Use separator lines (---) between analysis sections (e.g., SWOT Analysis separated by points).`
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
  
  // If session doesn't exist, try to initialize it
  if (!chatSession) {
    initializeChat(currentHistory, currentSystemInstruction);
  }
  
  if (!chatSession) {
    throw new Error("Failed to initialize chat session.");
  }

  try {
    // Construct message payload
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
    
    // Fallback for empty message if user just sends attachment without text (should be valid but safe to check)
    if (parts.length === 0) {
      parts.push({ text: '' });
    }

    // Optimization: If only text, pass string. If mixed/attachment, pass parts.
    // This helps avoid some edge-case payload issues with the SDK.
    const messagePayload = (parts.length === 1 && parts[0].text !== undefined) 
      ? parts[0].text 
      : parts;

    return await chatSession.sendMessageStream({
      message: messagePayload
    });

  } catch (error) {
    console.error("Error sending message to Gemini. Attempting session reset...", error);
    
    // Retry Strategy:
    // If the session is corrupted (e.g. 500 error or unknown state), reset and try once more.
    try {
       // 1. Reset Session
       resetChat();
       
       // 2. Re-initialize with provided history and instruction
       initializeChat(currentHistory, currentSystemInstruction);
       
       if (!chatSession) throw new Error("Failed to re-initialize chat session after error.");

       // 3. Re-construct Payload
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
       
       const messagePayload = (parts.length === 1 && parts[0].text !== undefined) 
        ? parts[0].text 
        : parts;

       // 4. Retry Send
       return await chatSession.sendMessageStream({
         message: messagePayload
       });

    } catch (retryError: any) {
       console.error("Retry failed:", retryError);
       // Customize error if key is missing
       if (retryError.message?.includes('API key') || retryError.message?.includes('403')) {
         throw new Error("API Key Invalid or Missing. Please check Vercel settings.");
       }
       throw retryError;
    }
  }
};

export const analyzeInputIntent = async (text: string): Promise<'DRAW' | 'CHAT'> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this user input: "${text}".
      Determine if the user is explicitly asking to GENERATE, DRAW, CREATE, or VISUALIZE an image/picture/art/logo.
      
      Examples:
      "Draw a cat" -> DRAW
      "Make me a logo" -> DRAW
      "Generate a landscape" -> DRAW
      "Visualize a futuristic city" -> DRAW
      "Create an image of a dragon" -> DRAW
      "Hello" -> CHAT
      "Write a poem" -> CHAT
      "How are you?" -> CHAT
      "Change this image to cartoon style" -> DRAW
      "Edit this photo" -> DRAW
      
      Respond ONLY with "DRAW" or "CHAT".`,
    });

    const intent = response.text?.trim().toUpperCase();
    return intent === 'DRAW' ? 'DRAW' : 'CHAT';
  } catch (e) {
    console.warn("Intent analysis failed, defaulting to CHAT", e);
    return 'CHAT';
  }
};

export const generateImage = async (prompt: string, attachment?: { data: string; mimeType: string }): Promise<string> => {
  try {
    const parts: Part[] = [];
    
    // Add image first if available (for image editing/reference)
    if (attachment) {
      parts.push({
        inlineData: {
          data: attachment.data,
          mimeType: attachment.mimeType
        }
      });
    }
    
    // Add the prompt
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
    
    if (!candidate) {
       throw new Error("No response candidates returned from Gemini.");
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
       throw new Error(`Image generation blocked. Reason: ${candidate.finishReason}`);
    }

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
    
    if (textResponse) {
      throw new Error(textResponse);
    }
    
    throw new Error("No image generated in response.");
  } catch (error: any) {
    console.error("Error generating image:", error);
    if (error.message?.includes('API key')) {
        throw new Error("Missing API Key. Cannot generate image.");
    }
    throw error;
  }
};