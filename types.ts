export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  imageUrl?: string; // Kept for backward compatibility with memory
  attachment?: {     // For User uploaded images
    data: string;
    mimeType: string;
  };
  type?: 'text' | 'image';
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface User {
  username: string;
  displayName: string;
  avatarInitials: string;
  language?: LanguageCode;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  themeColor: string;
  iconId: 'cpu' | 'terminal' | 'briefcase'; // Removed 'feather' and 'image'
}

export type LanguageCode = 'en' | 'id' | 'ja' | 'es' | 'fr' | 'de';

export interface LanguageDefinition {
  code: LanguageCode;
  name: string;
  flag: string;
  voiceCode: string; // For Speech Recognition (e.g., 'en-US', 'id-ID')
}