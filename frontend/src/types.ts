export type GamePhase = 'LOBBY' | 'PLAYING' | 'VOTING' | 'RESULTS';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isMaster: boolean;
  hasSubmitted: boolean;
  hasVoted?: boolean;
}

export interface PlayerVotes {
  similar: number;
  funny: number;
}

export interface GameSettings {
  roundTime: number;
  maxRounds: number;
}

export interface GameState {
  id: string;
  state: GamePhase;
  players: Player[];
  masterId: string | null;
  character?: string | null;
  tips: string[];
  drawings: Record<string, string>; // { [playerId]: dataUrl }
  votes: Record<string, PlayerVotes>; // { [playerId]: { similar, funny } }
  timer?: number;
  settings?: GameSettings;
  currentRound?: number;
  isGameOver?: boolean;
}

export type VoteCategory = 'similar' | 'funny';

export interface ReactionItem {
  id: number;
  emoji: string;
  senderName: string;
  x: number;
}

export const AVATARS = [
  '🦊', '🦁', '🐸', '🐼', '🦄', '🤖', 
  '👻', '👽', '🦖', '🐱', '🐶', '🍕', 
  '🚀', '👑', '🎨', '🕶️', '⚡', '🥑'
];
