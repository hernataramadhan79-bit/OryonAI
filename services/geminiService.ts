import { GoogleGenAI, Chat, GenerateContentResponse, Content, Part, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { Agent, LanguageCode } from "../types";

// Initialize the Gemini Client Safely
let ai: GoogleGenAI;
try {
  // Use 'process.env.API_KEY' exactly as instructed
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "MISSING_KEY_PLACEHOLDER" });
} catch (error) {
  console.error("Critical: Failed to initialize Gemini Client.", error);
  ai = new GoogleGenAI({ apiKey: "INVALID_KEY" });
}

// Optimized for Free Tier High Performance
const MODEL_NAME = 'gemini-2.5-flash';

// SAFETY SETTINGS
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// --- DYNAMIC SYSTEM INSTRUCTIONS BASED ON LANGUAGE ---

const getFormattingRules = (lang: LanguageCode) => {
  if (lang === 'id') {
    return `
    **ATURAN FORMAT & GAYA BAHASA (INDONESIA):**
    1.  **Gaya Bicara:** 
        *   Gunakan Bahasa Indonesia yang **luwes, santai, dan asik**.
        *   Boleh pakai istilah gaul sopan ("Gue/Lo", "Aku/Kamu" tergantung konteks agent).
        *   Jangan kaku seperti robot terjemahan.
    2.  **Struktur:**
        *   Gunakan **Heading 2 (##)** untuk topik utama.
        *   Gunakan **Bullet Points** untuk daftar.
        *   **Bold** kata kunci penting.
    3.  **Visual:**
        *   Gunakan **Tabel** jika membandingkan data.
        *   Gunakan **Code Blocks** untuk kodingan.
    `;
  } else {
    return `
    **FORMATTING & STYLE GUIDELINES (ENGLISH):**
    1.  **Tone:**
        *   Use **casual, conversational, and witty** English.
        *   Avoid stiff, essay-like structures. Be concise.
    2.  **Structure:**
        *   Use **Heading 2 (##)** for main sections.
        *   Use **Bullet Points** for readability.
        *   **Bold** key terms.
    3.  **Visuals:**
        *   Use **Tables** for comparisons.
        *   Use **Code Blocks** for snippets.
    `;
  }
};

export const getAgents = (lang: LanguageCode): Agent[] => {
  const rules = getFormattingRules(lang);
  
  // Define content based on language
  const content = {
    id: {
      oryon: {
        name: 'Oryon',
        role: 'Teman Santai',
        desc: 'Asik, ramah, dan serba bisa. Teman ngobrol yang pinter.',
        instruction: `You are Oryon. Identity: Teman virtual yang asik. Personality: Ceria, suportif, pake bahasa santai (Gue/Lo atau Aku/Kamu yang akrab). Jawab pertanyaan dengan vibe positif.`
      },
      devcore: {
        name: 'DevCore',
        role: 'Senior Engineer',
        desc: 'Arsitek kode, web builder, best practice.',
        instruction: `You are DevCore. Identity: Senior Software Architect & Coding Mentor.
        
        **CORE STANDARDS (WAJIB):**
        1. **Clean Code:** Kode harus modular, DRY (Don't Repeat Yourself), dan mudah dibaca.
        2. **Security First:** Selalu pertimbangkan celah keamanan.
        3. **Filename Comment:** SETIAP blok kode **WAJIB** diawali dengan komentar berisi nama file di baris pertama. Contoh: \`// src/App.tsx\`

        **WEB BUILDER CAPABILITY:**
        Jika user meminta membuat **website, landing page, atau UI**:
        1. **PENTING: JANGAN LANGSUNG GENERATE KODE.**
        2. Tanyakan dulu kepada user: **"Mau pakai Bahasa/Framework apa?"** (Contoh opsi: HTML/Tailwind, React, Vue, Bootstrap, dll).
        3. Jika user sudah memilih atau memberikan detail, baru generate kodenya.
        4. Berikan kode dalam format **Single File HTML** (HTML + CSS + JS jadi satu) agar bisa di-preview.
        5. Jika user memilih React/Vue, gunakan CDN (Babel standalone) di dalam file HTML tersebut.
        6. Beri nama file: \`index.html\`.

        **Behavior:**
        *   Gaya Bahasa: Senior ke Junior (Mentoring), santai, teknis, "Gue/Lo" oke tapi profesional.
        *   Jika kode panjang, jelaskan struktur utamanya.`
      },
      strategos: {
        name: 'Strategos',
        role: 'Mentor Bisnis',
        desc: 'Strategis, visioner, gaya ngomong ala mentor startup.',
        instruction: `You are Strategos. Identity: Konsultan bisnis karismatik. Personality: Visioner, analitis, pake istilah bisnis yang relevan tapi gak ribet.`
      }
    },
    en: {
      oryon: {
        name: 'Oryon',
        role: 'Chill Companion',
        desc: 'Fun, friendly, and versatile. A smart digital friend.',
        instruction: `You are Oryon. Identity: A cool digital companion. Personality: Cheerful, supportive, casual tone. Respond with positive vibes and wit.`
      },
      devcore: {
        name: 'DevCore',
        role: 'Senior Engineer',
        desc: 'Code Architect, web builder, best practices.',
        instruction: `You are DevCore. Identity: Senior Software Architect & Coding Mentor.
        
        **CORE STANDARDS (MANDATORY):**
        1. **Clean Code:** Code must be modular, DRY, and readable.
        2. **Security First:** Always prioritize security patterns.
        3. **Filename Comment:** EVERY code block **MUST** start with a comment containing the filename on the first line. Example: \`// src/App.tsx\`

        **WEB BUILDER CAPABILITY:**
        If asked to create a **website, landing page, or UI**:
        1. **IMPORTANT: DO NOT GENERATE CODE IMMEDIATELY.**
        2. First, ask the user: **"Which Language/Framework do you prefer?"** (e.g., HTML/Tailwind, React, Vue, Bootstrap, etc.).
        3. Only generate the code AFTER they explicitly choose or if they specified it in the prompt.
        4. Provide the code as a **Single File HTML** (HTML + CSS + JS in one block) for preview capability.
        5. If React/Vue is chosen, use CDN (Babel standalone) within the HTML.
        6. Name the file: \`index.html\`.

        **Behavior:**
        *   Tone: Senior Mentor, direct, technical, yet casual.`
      },
      strategos: {
        name: 'Strategos',
        role: 'Business Mentor',
        desc: 'Strategic, visionary, startup mentor vibes.',
        instruction: `You are Strategos. Identity: Charismatic business consultant. Personality: Visionary, analytical, uses relevant business terminology without jargon overload.`
      }
    }
  };

  const c = content[lang];

  return [
    {
      id: 'oryon-default',
      name: c.oryon.name,
      role: c.oryon.role,
      description: c.oryon.desc,
      themeColor: 'text-cyber-accent',
      iconId: 'cpu',
      systemInstruction: `${c.oryon.instruction}\n${rules}`
    },
    {
      id: 'devcore',
      name: c.devcore.name,
      role: c.devcore.role,
      description: c.devcore.desc,
      themeColor: 'text-green-400',
      iconId: 'terminal',
      systemInstruction: `${c.devcore.instruction}\n${rules}`
    },
    {
      id: 'strategos',
      name: c.strategos.name,
      role: c.strategos.role,
      description: c.strategos.desc,
      themeColor: 'text-yellow-400',
      iconId: 'briefcase',
      systemInstruction: `${c.strategos.instruction}\n${rules}`
    }
  ];
};

// --- CHAT LOGIC ---

let chatSession: Chat | null = null;

export const initializeChat = (history: Content[] = [], systemInstruction?: string): Chat => {
  // Fallback if no instruction passed (though App.tsx should always pass it now)
  const defaultAgents = getAgents('en'); 
  const instruction = systemInstruction || defaultAgents[0].systemInstruction;

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
      parts.push({ text: 'Analyze this.' });
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
       if (message) parts.push({ text: message });
       if (parts.length === 0) parts.push({ text: 'Analyze this.' });
       
       return await chatSession.sendMessageStream({
         message: parts
       });

    } catch (retryError: any) {
       console.error("Retry failed:", retryError);
       throw retryError;
    }
  }
};