export const AVATAR_NAMES: Record<string, string> = {
  'doodle-stickman': 'Boneco Palito',
  'doodle-cat': 'Gatinho',
  'doodle-dog': 'Cachorrinho',
  'doodle-frog': 'Sapinho',
  'doodle-alien': 'Alien',
  'doodle-robot': 'Robô de Lata',
  'doodle-ghost': 'Fantasminha',
  'doodle-dino': 'Dino',
  'doodle-bear': 'Ursinho',
  'doodle-star': 'Estrelinha',
  'doodle-octopus': 'Polvinho',
  'doodle-potato': 'Batatinha',
  'doodle-skull': 'Caveirinha',
  'doodle-wizard': 'Maguinho',
  'doodle-cloud': 'Nuvem',
  'doodle-flower': 'Florzinha',
  'doodle-sun': 'Solzinho',
  'doodle-penguin': 'Pinguim',
};

// Map legacy emoji to doodle avatars for backward-compatibility
export const EMOJI_TO_DOODLE: Record<string, string> = {
  '🦊': 'doodle-cat',
  '🦁': 'doodle-bear',
  '🐸': 'doodle-frog',
  '🐼': 'doodle-potato',
  '🦄': 'doodle-star',
  '🤖': 'doodle-robot',
  '👻': 'doodle-ghost',
  '👽': 'doodle-alien',
  '🦖': 'doodle-dino',
  '🐱': 'doodle-cat',
  '🐶': 'doodle-dog',
  '🍕': 'doodle-potato',
  '🚀': 'doodle-wizard',
  '👑': 'doodle-stickman',
  '🎨': 'doodle-flower',
  '🕶️': 'doodle-sun',
  '⚡': 'doodle-cloud',
  '🥑': 'doodle-octopus',
};

interface AvatarIconProps {
  avatar?: string;
  className?: string;
}

export default function AvatarIcon({ avatar = 'doodle-stickman', className = 'w-7 h-7' }: AvatarIconProps) {
  const resolved = EMOJI_TO_DOODLE[avatar] || avatar;

  switch (resolved) {
    case 'doodle-stickman':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <circle cx="24" cy="14" r="8.5" fill="#fef08a" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="21" cy="13" r="1.3" fill="#18181b" />
          <circle cx="27" cy="13" r="1.3" fill="#18181b" />
          <path d="M 21 16.5 Q 24 19 27 16.5" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 24 22.5 L 24 36" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 14 26 L 24 29 L 34 26" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 24 36 L 17 44 M 24 36 L 31 44" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-cat':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 14 22 L 11 11 L 21 17 C 22.5 16.5 25.5 16.5 27 17 L 37 11 L 34 22 C 37 32 11 32 14 22 Z"
            fill="#ffedd5"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 15 16 L 14 13 L 18 16" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 33 16 L 34 13 L 30 16" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="22" r="1.5" fill="#18181b" />
          <circle cx="28" cy="22" r="1.5" fill="#18181b" />
          <path d="M 24 24 L 24 25.5 M 22 26.5 Q 24 28 26 26.5" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 9 22 L 16 23 M 9 25 L 16 25 M 32 23 L 39 22 M 32 25 L 39 25" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-dog':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 16 17 C 10 17 8 29 13 32 C 16 33 18 26 18 20" fill="#fed7aa" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 32 17 C 38 17 40 29 35 32 C 32 33 30 26 30 20" fill="#fed7aa" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 17 19 C 17 11 31 11 31 19 C 31 31 17 31 17 19 Z" fill="#fffbeb" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="21" cy="18" r="1.5" fill="#18181b" />
          <circle cx="27" cy="18" r="1.5" fill="#18181b" />
          <ellipse cx="24" cy="23" rx="2.5" ry="1.8" fill="#18181b" />
          <path d="M 24 24.8 L 24 27 M 21 27 Q 24 28.5 27 27" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 23 27.5 Q 24 32 25 27.5" fill="#f43f5e" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-frog':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <circle cx="17" cy="16" r="5" fill="#bbf7d0" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="31" cy="16" r="5" fill="#bbf7d0" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="17" cy="16" r="1.6" fill="#18181b" />
          <circle cx="31" cy="16" r="1.6" fill="#18181b" />
          <path d="M 13 20 C 9 32 39 32 35 20 C 33 17 15 17 13 20 Z" fill="#bbf7d0" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="15" cy="24" r="1.8" fill="#fca5a5" />
          <circle cx="33" cy="24" r="1.8" fill="#fca5a5" />
          <path d="M 16 23 Q 24 29 32 23" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-alien':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 24 14 L 24 8" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="7" r="2.8" fill="#fde047" stroke="#18181b" strokeWidth="2" />
          <path d="M 16 22 C 13 13 35 13 32 22 C 30 33 18 33 16 22 Z" fill="#d9f99d" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="24" cy="20" r="5.5" fill="#ffffff" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="24" cy="20" r="2.8" fill="#18181b" />
          <circle cx="25.5" cy="18.5" r="1" fill="#ffffff" />
          <path d="M 19 27 Q 24 30 29 27" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-robot':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 24 13 L 24 8 M 21 8 L 27 8" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="11" y="20" width="3" height="7" rx="1" fill="#94a3b8" stroke="#18181b" strokeWidth="2" />
          <rect x="34" y="20" width="3" height="7" rx="1" fill="#94a3b8" stroke="#18181b" strokeWidth="2" />
          <rect x="14" y="13" width="20" height="20" rx="3" fill="#cffafe" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="19" cy="20" r="2" fill="#18181b" />
          <circle cx="29" cy="20" r="2" fill="#18181b" />
          <path d="M 18 26 L 30 26 M 21 24 L 21 28 M 24 24 L 24 28 M 27 24 L 27 28" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-ghost':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 15 25 C 15 12 33 12 33 25 L 33 36 Q 30 33.5 28 36 Q 25 33.5 23 36 Q 20 33.5 18 36 Q 15 33.5 15 36 Z"
            fill="#ffffff"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 15 26 Q 11 28 13 30" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <path d="M 33 26 Q 37 28 35 30" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="20" cy="21" rx="1.8" ry="2.2" fill="#18181b" />
          <ellipse cx="28" cy="21" rx="1.8" ry="2.2" fill="#18181b" />
          <ellipse cx="24" cy="26.5" rx="1.8" ry="2.2" fill="#18181b" />
        </svg>
      );

    case 'doodle-dino':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 17 19 L 13 21 L 17 23 L 13 25 L 17 27 L 13 29 L 17 31" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d="M 17 34 L 17 19 C 17 13 27 13 29 16 L 35 17 C 37 18 37 23 33 23 L 28 23 L 28 34 Z"
            fill="#a7f3d0"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="28" cy="17.5" r="1.5" fill="#18181b" />
          <path d="M 32 20 L 35 19.5" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 26 26 L 29 27" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-bear':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <circle cx="16" cy="15" r="4.5" fill="#fef3c7" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="32" cy="15" r="4.5" fill="#fef3c7" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="10" fill="#fef3c7" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="24" cy="26" rx="4.5" ry="3.5" fill="#ffffff" stroke="#18181b" strokeWidth="2" />
          <circle cx="20" cy="21" r="1.5" fill="#18181b" />
          <circle cx="28" cy="21" r="1.5" fill="#18181b" />
          <circle cx="24" cy="25" r="1.5" fill="#18181b" />
          <path d="M 22 27 Q 24 28.5 26 27" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-star':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 24 8 L 27.8 17.5 L 38 18.5 L 30.5 25.5 L 32.5 35.5 L 24 30.5 L 15.5 35.5 L 17.5 25.5 L 10 18.5 L 20.2 17.5 Z"
            fill="#fef08a"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="22" r="1.5" fill="#18181b" />
          <circle cx="27" cy="22" r="1.5" fill="#18181b" />
          <path d="M 21.5 25.5 Q 24 28 26.5 25.5" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-octopus':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 15 24 C 15 13 33 13 33 24 C 33 29 32 32 30 35 Q 28 32 27 34 Q 25 32 24 34 Q 23 32 21 34 Q 20 32 18 35 C 16 32 15 29 15 24 Z"
            fill="#fbcfe8"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="22" r="1.5" fill="#18181b" />
          <circle cx="28" cy="22" r="1.5" fill="#18181b" />
          <circle cx="24" cy="25.5" r="1.5" fill="#18181b" />
          <circle cx="17" cy="24" r="1.3" fill="#f43f5e" opacity="0.6" />
          <circle cx="31" cy="24" r="1.3" fill="#f43f5e" opacity="0.6" />
        </svg>
      );

    case 'doodle-potato':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 16 22 C 14 14 30 13 33 20 C 35 27 31 34 23 34 C 15 34 16 28 16 22 Z"
            fill="#fde68a"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="21" r="1.8" fill="#18181b" />
          <circle cx="27" cy="21" r="1.8" fill="#18181b" />
          <path d="M 22 25.5 Q 24 28 26 25.5" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
          <circle cx="17" cy="26" r="0.8" fill="#92400e" />
          <circle cx="30" cy="18" r="0.8" fill="#92400e" />
          <circle cx="29" cy="28" r="0.8" fill="#92400e" />
        </svg>
      );

    case 'doodle-skull':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 16 21 C 16 12 32 12 32 21 C 32 26 29 26 28 28 L 28 32 L 20 32 L 20 28 C 19 26 16 26 16 21 Z"
            fill="#f4f4f5"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="20.5" cy="20.5" rx="2.4" ry="2.8" fill="#18181b" />
          <ellipse cx="27.5" cy="20.5" rx="2.4" ry="2.8" fill="#18181b" />
          <path d="M 24 24 L 23 26 L 25 26 Z" fill="#18181b" />
          <path d="M 22 30 L 22 32 M 24 30 L 24 32 M 26 30 L 26 32" stroke="#18181b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-wizard':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 17 22 C 17 31 31 31 31 22" fill="#fffbeb" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 16 21 L 24 6 L 32 21 Z" fill="#e9d5ff" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 13 21 Q 24 24 35 21" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 24 11 L 24.5 13 L 26 13.5 L 24.5 14 L 24 16 L 23.5 14 L 22 13.5 L 23.5 13 Z" fill="#fef08a" stroke="#18181b" strokeWidth="1" />
          <circle cx="21" cy="25" r="1.3" fill="#18181b" />
          <circle cx="27" cy="25" r="1.3" fill="#18181b" />
          <path d="M 22 28 Q 24 29.5 26 28" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-cloud':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path
            d="M 15 26 C 12 26 11 19 16 19 C 16 14 24 13 27 17 C 32 15 35 20 33 24 C 36 26 35 30 30 30 L 16 30 C 13 30 13 26 15 26 Z"
            fill="#bae6fd"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="23" r="1.3" fill="#18181b" />
          <circle cx="26" cy="23" r="1.3" fill="#18181b" />
          <path d="M 21 26 Q 23 27.5 25 26" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 19 33 L 18 36 M 26 33 L 25 36" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-flower':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <circle cx="24" cy="14" r="4.5" fill="#fecdd3" stroke="#18181b" strokeWidth="2" />
          <circle cx="32" cy="20" r="4.5" fill="#fecdd3" stroke="#18181b" strokeWidth="2" />
          <circle cx="30" cy="29" r="4.5" fill="#fecdd3" stroke="#18181b" strokeWidth="2" />
          <circle cx="18" cy="29" r="4.5" fill="#fecdd3" stroke="#18181b" strokeWidth="2" />
          <circle cx="16" cy="20" r="4.5" fill="#fecdd3" stroke="#18181b" strokeWidth="2" />
          <circle cx="24" cy="23" r="5.5" fill="#fef08a" stroke="#18181b" strokeWidth="2.5" />
          <circle cx="22" cy="22" r="1" fill="#18181b" />
          <circle cx="26" cy="22" r="1" fill="#18181b" />
          <path d="M 22.5 24.5 Q 24 26 25.5 24.5" stroke="#18181b" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 24 28.5 L 24 37" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-sun':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 24 10 L 24 6 M 24 38 L 24 42 M 10 24 L 6 24 M 38 24 L 42 24 M 14 14 L 11 11 M 34 34 L 37 37 M 14 34 L 11 37 M 34 14 L 37 11" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="8.5" fill="#fde047" stroke="#18181b" strokeWidth="2.5" />
          <rect x="18" y="21" width="4.8" height="4" rx="1" fill="#18181b" />
          <rect x="25.2" y="21" width="4.8" height="4" rx="1" fill="#18181b" />
          <path d="M 22.8 22 L 25.2 22" stroke="#18181b" strokeWidth="2" />
          <path d="M 21.5 27.5 Q 24 29 26.5 27" stroke="#18181b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'doodle-penguin':
      return (
        <svg viewBox="0 0 48 48" className={`${className} inline-block select-none shrink-0`} fill="none">
          <path d="M 16 23 Q 12 27 15 30" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 32 23 Q 36 27 33 30" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M 16 24 C 16 14 32 14 32 24 C 32 34 16 34 16 24 Z"
            fill="#18181b"
            stroke="#18181b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="24" cy="26" rx="4.5" ry="6" fill="#ffffff" />
          <circle cx="21" cy="18" r="1.3" fill="#ffffff" />
          <circle cx="27" cy="18" r="1.3" fill="#ffffff" />
          <path d="M 22.5 20.5 L 25.5 20.5 L 24 23 Z" fill="#fb923c" stroke="#18181b" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M 20 34 L 19 37 M 28 34 L 29 37" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return (
        <span className={`${className} inline-flex items-center justify-center font-bold font-kalam text-zinc-900 select-none text-base`}>
          {avatar}
        </span>
      );
  }
}
