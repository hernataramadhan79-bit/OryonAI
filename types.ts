export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  imageUrl?: string; // For AI generated images
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
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  systemInstruction: string;
  themeColor: string;
  iconId: 'cpu' | 'terminal' | 'feather' | 'briefcase' | 'image';
}