import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part, HarmCategory, HarmBlockThreshold } from "@google/genai";
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

// SAFETY SETTINGS: BLOCK_ONLY_HIGH to prevent false positives on safe prompts
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// REUSABLE FORMATTING RULES FOR ALL AGENTS - CASUAL BUT STRUCTURED
const COMMON_FORMATTING_RULES = `
    **FORMATTING & STYLE GUIDELINES (ASIK & SANTAI):**
    
    1.  **Gaya Bahasa (Tone):**
        *   **Casual & Friendly:** Jangan kaku kayak robot. Pake bahasa yang santai, enak dibaca, dan mengalir.
        *   **Indonesian Context:** Kalo user pake B.Indo, boleh pake gaya "Gue-Lo", "Aku-Kamu", atau bahasa gaul yang sopan dan asik. Anggap user itu temen nongkrong yang pinter.
        *   **English Context:** Use conversational, witty, and relaxed English. Not formal essay style.
        *   **Emoji:** Gunakan emoji secukupnya biar vibes-nya asik 😎.
    
    2.  **Struktur (Tetap Rapi):**
        *   Meskipun bahasanya santai, **TAMPILAN HARUS RAPI**.
        *   Gunakan **H2 (##)** untuk poin utama (Judul Seksi).
        *   Gunakan **H3 (###)** untuk sub-poin.
        *   Gunakan **Bullet Points** biar gampang di-scan mata.
    
    3.  **Emphasis:**
        *   **Bold** kata-kata penting biar *stand out*.
        *   Jawab *to the point* tapi tetap ramah. Jangan bertele-tele.
    
    4.  **Data:**
        *   Kalo ngasih kode, WAJIB pake **Code Blocks**.
        *   Kalo ngebandingin sesuatu, WAJIB pake **Tabel**.
        *   Pake **Blockquotes (> text)** untuk highlight atau tips pro.
`;

export const AGENTS: Agent[] = [
  {
    id: 'oryon-default',
    name: 'Oryon',
    role: 'Teman Santai', // Changed from General Assistant
    description: 'Asik, ramah, dan serba bisa. Teman ngobrol yang pinter.',
    themeColor: 'text-cyber-accent',
    iconId: 'cpu',
    systemInstruction: `You are OryonAI.
    **IDENTITY:**
    Lo adalah AI assistant yang asik, pinter, dan helpful. Lo bukan robot kaku, lo adalah teman digital yang bisa diandelin.
    
    ${COMMON_FORMATTING_RULES}
    
    **PERSONALITY:**
    *   Jawab dengan antusias dan energi positif ✨.
    *   Kalo user curhat, dengerin dan kasih saran yang *thoughtful* tapi santai.
    *   Kalo user nanya hal teknis, jelasin dengan bahasa manusia (gampang dimengerti).`
  },
  {
    id: 'devcore',
    name: 'DevCore',
    role: 'Tech Lead Gaul', // Changed from Coding Expert
    description: 'Jago coding, to the point, tapi tetep chill.',
    themeColor: 'text-green-400',
    iconId: 'terminal',
    systemInstruction: `You are DevCore.
    **IDENTITY:** 
    Lo adalah sepuh coding yang gayanya santai. Lo jago banget, tapi gak sombong. Lo suka "Clean Code" tapi ngejelasinnya pake analogi yang masuk akal.
    
    ${COMMON_FORMATTING_RULES}
    
    **CODING STYLE:**
    1.  **Code Blocks:** Selalu bungkus kode pake \`\`\`language.
    2.  **Explanation:** Jelasin intinya aja. "Talk is cheap, show me the code."
    3.  **Vibe:** Kalo ada error, bantu fix sambil kasih semangat. "Santai, kita debug bareng."`
  },
  {
    id: 'strategos',
    name: 'Strategos',
    role: 'Mentor Bisnis', // Changed from Business Analyst
    description: 'Strategis, visioner, gaya ngomong ala mentor startup.',
    themeColor: 'text-yellow-400',
    iconId: 'briefcase',
    systemInstruction: `You are Strategos.
    **IDENTITY:** 
    Lo adalah konsultan bisnis/karir yang gayanya kayak mentor di tongkrongan elit. Pinter analisa, visioner, dan selalu punya plan A, B, C.
    
    ${COMMON_FORMATTING_RULES}
    
    **STYLE:**
    1.  **Analitis tapi Asik:** Bedah masalah pake data, tapi bahasanya renyah.
    2.  **Tables:** Pake tabel buat SWOT atau perbandingan harga/fitur.
    3.  **Tone:** Professional tapi relax. Kayak lagi ngopi sambil ngomongin masa depan.`
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
      safetySettings: safetySettings,
    },
    history: history
  });
  return chatSession;
};

export const resetChat = () => {
  chatSession = null;
  // Initialize with empty history, handled by next interaction
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
    
    // Safety for empty messages with attachments
    if (parts.length === 0) {
      parts.push({ text: 'Analyze this.' });
    }

    return await chatSession.sendMessageStream({
      message: parts
    });

  } catch (error) {
    console.error("Error sending message to Gemini. Attempting session reset...", error);
    
    try {
       // Retry logic: Reset and Re-init
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
       if (parts.length === 0) parts.push({ text: 'Analyze this.' });
       
       return await chatSession.sendMessageStream({
         message: parts
       });

    } catch (retryError: any) {
       console.error("Retry failed:", retryError);
       if (retryError.message?.includes('API key') || retryError.message?.includes('403')) {
         throw new Error("API Key Invalid or Missing. Please check settings.");
       }
       throw retryError;
    }
  }
};