import { AVATARS } from '../types';

const NAME_KEY = 'player_name';
const AVATAR_KEY = 'player_avatar';

export function loadIdentity(): { name: string; avatar: string } {
  let name = '';
  let avatar = '';
  try {
    name = (localStorage.getItem(NAME_KEY) || '').slice(0, 20);
    avatar = localStorage.getItem(AVATAR_KEY) || '';
  } catch {
    // localStorage indisponível (SSR/privado) — segue com padrão
  }
  if (!avatar || !AVATARS.includes(avatar)) {
    avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  }
  return { name, avatar };
}

export function saveIdentity(name: string, avatar: string) {
  try {
    if (name.trim()) localStorage.setItem(NAME_KEY, name.trim().slice(0, 20));
    if (avatar) localStorage.setItem(AVATAR_KEY, avatar);
  } catch {
    // ignora falha de persistência
  }
}

export function getInvitedRoom(): string | null {
  if (typeof window === 'undefined') return null;
  const code = new URLSearchParams(window.location.search).get('room')?.trim().toUpperCase();
  return code && code.length >= 3 ? code : null;
}
