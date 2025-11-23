import { User } from '../types';

const USERS_KEY = 'oryon_users_db';
const SESSION_KEY = 'oryon_current_session';

export const loginUser = (username: string, password: string): User => {
  const usersDb = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  
  // Simple simulation: check if user exists and password matches
  if (usersDb[username] && usersDb[username].password === password) {
    const user: User = {
      username: username,
      displayName: usersDb[username].displayName,
      avatarInitials: usersDb[username].displayName.substring(0, 2).toUpperCase()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  
  throw new Error("Access Denied: Invalid credentials.");
};

export const registerUser = (username: string, password: string, displayName: string): User => {
  const usersDb = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  
  if (usersDb[username]) {
    throw new Error("Identity already registered.");
  }
  
  const newUser = {
    username,
    password, // Stored in plain text solely for this local simulation demo
    displayName
  };
  
  usersDb[username] = newUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(usersDb));
  
  const user: User = {
    username,
    displayName,
    avatarInitials: displayName.substring(0, 2).toUpperCase()
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const loginAsGuest = (): User => {
  // Create a clean ephemeral guest user for demo purposes
  const timestamp = Date.now().toString().slice(-4);
  const guestUser: User = {
    username: `guest-${timestamp}`,
    displayName: 'Guest Explorer',
    avatarInitials: 'GE'
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(guestUser));
  return guestUser;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSessionUser = (): User | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (e) {
    // If storage is corrupted, clear it to prevent app crash loop
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};