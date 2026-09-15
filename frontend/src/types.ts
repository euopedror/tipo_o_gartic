export type GamePhase = 'LOBBY' | 'PLAYING' | 'VOTING' | 'RESULTS';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isMaster: boolean;
  isHost?: boolean;
  hasSubmitted: boolean;
  hasVoted?: boolean;
  isVoiceMutedByHost?: boolean;
  /** false quando fechou/perdeu conexão sem clicar em sair (fantasma em graça de 25s) */
  connected?: boolean;
}

export interface PlayerVotes {
  similar: number;
  funny: number;
}

export interface GameSettings {
  roundTime: number;
  maxRounds: number;
  voiceEnabled?: boolean;
  reactionsEnabled?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  isMaster?: boolean;
  isHost?: boolean;
  isTip?: boolean;
  isSystem?: boolean;
  timestamp: number;
}

export interface GameState {
  id: string;
  state: GamePhase;
  players: Player[];
  masterId: string | null;
  hostId?: string | null;
  isChatMuted?: boolean;
  isVoiceDisabled?: boolean;
  isReactionsDisabled?: boolean;
  character?: string | null;
  tips: string[];
  messages?: ChatMessage[];
  drawings: Record<string, string>; // { [playerId]: dataUrl }
  votes: Record<string, PlayerVotes>; // { [playerId]: { similar, funny } }
  timer?: number;
  settings?: GameSettings;
  voiceUserIds?: string[];
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
  'doodle-stickman', 'doodle-cat', 'doodle-dog', 'doodle-frog', 'doodle-alien', 'doodle-robot',
  'doodle-ghost', 'doodle-dino', 'doodle-bear', 'doodle-star', 'doodle-octopus', 'doodle-potato',
  'doodle-skull', 'doodle-wizard', 'doodle-cloud', 'doodle-flower', 'doodle-sun', 'doodle-penguin'
];
