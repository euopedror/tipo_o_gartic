import { sounds } from './audioFx';

/**
 * Downloads a canvas dataURL image directly to the player's device as PNG.
 */
export function downloadDrawing(dataUrl: string, authorName: string = 'artista', characterName?: string | null) {
  try {
    sounds.playPop();

    const sanitizedAuthor = authorName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    const sanitizedChar = characterName ? `-${characterName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}` : '';
    const filename = `desenho-cego-${sanitizedAuthor}${sanitizedChar}-${Date.now().toString().slice(-4)}.png`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to download drawing:', err);
  }
}
