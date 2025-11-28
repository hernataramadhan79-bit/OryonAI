import { LanguageCode, LanguageDefinition } from '../types';

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', voiceCode: 'en-US' },
  { code: 'id', name: 'Indonesia', flag: '🇮🇩', voiceCode: 'id-ID' },
];

export const TRANSLATIONS = {
  en: {
    welcome: "Welcome Back",
    init: "Initialize",
    displayName: "DISPLAY NAME",
    username: "USERNAME",
    password: "PASSWORD",
    placeholderName: "Call sign...",
    placeholderUser: "User ID...",
    placeholderPass: "Key...",
    loginBtn: "ACCESS",
    registerBtn: "CREATE",
    guestBtn: "DEMO MODE",
    processing: "...",
    switchLogin: "Login",
    switchRegister: "Register",
    systemStatus: "STATUS",
    online: "ONLINE",
    selectModel: "MODEL SELECT",
    messagePlaceholder: "Message...",
    listening: "Listening...",
    send: "SEND",
    discard: "DISCARD",
    visualReady: "Visual Ready",
    madeBy: "By Hernata FTIG",
    clearChat: "Clear",
    logout: "Logout",
    memLink: "MEM-LINK",
    aiWelcome: "systems online. Objective?",
    aiClear: "Memory cleared.",
    visualProcessing: "Rendering...",
    visualSuccess: "Generated.",
    errorGeneric: "System Error.",
  },
  id: {
    welcome: "Selamat Datang",
    init: "Inisialisasi",
    displayName: "NAMA",
    username: "USERNAME",
    password: "PASSWORD",
    placeholderName: "Panggilan...",
    placeholderUser: "ID...",
    placeholderPass: "Kunci...",
    loginBtn: "MASUK",
    registerBtn: "DAFTAR",
    guestBtn: "MODE DEMO",
    processing: "...",
    switchLogin: "Masuk",
    switchRegister: "Daftar",
    systemStatus: "STATUS",
    online: "ONLINE",
    selectModel: "PILIH MODEL",
    messagePlaceholder: "Ketik...",
    listening: "Mendengarkan...",
    send: "KIRIM",
    discard: "HAPUS",
    visualReady: "Siap",
    madeBy: "Oleh Hernata FTIG",
    clearChat: "Hapus",
    logout: "Keluar",
    memLink: "MEM-LINK",
    aiWelcome: "sistem online. Tujuan?",
    aiClear: "Memori dibersihkan.",
    visualProcessing: "Memproses...",
    visualSuccess: "Berhasil.",
    errorGeneric: "Error.",
  }
};

export const getTranslation = (lang: LanguageCode) => {
  return TRANSLATIONS[lang] || TRANSLATIONS['en'];
};

export const getSystemLanguageInstruction = (lang: LanguageCode) => {
  switch (lang) {
    case 'id':
      return "\n\n**IMPORTANT INSTRUCTION: From now on, you MUST reply strictly in INDONESIAN (BAHASA INDONESIA). Gunakan bahasa Indonesia yang asik, santai, tapi tetap rapi.**";
    default:
      return "\n\n**IMPORTANT INSTRUCTION: From now on, you MUST reply strictly in ENGLISH.**";
  }
};