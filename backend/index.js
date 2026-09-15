import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

// Health check and root route (avoids 404 on Render and browser navigation)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    game: 'Desenho Cego Server',
    activeRooms: Object.keys(rooms).length
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};
const pendingDisconnects = new Map();

const GAME_STATES = {
  LOBBY: 'LOBBY',
  PLAYING: 'PLAYING',
  VOTING: 'VOTING',
  RESULTS: 'RESULTS'
};

function createRoom(roomId) {
  rooms[roomId] = {
    id: roomId,
    state: GAME_STATES.LOBBY,
    players: {},
    hostId: null,
    isChatMuted: false,
    masterId: null,
    masterHistory: [],
    lastMasterId: null,
    character: null,
    drawings: {}, // { playerId: imageDataUrl }
    tips: [],
    messages: [], // Live chat messages for all players
    votes: {}, // { playerId: { similar: count, funny: count } }
    voteRecords: {}, // { voterId: { similar: votedPlayerId|null, funny: votedPlayerId|null } } — anti voto duplo
    timer: 0,
    timerInterval: null,
    settings: {
      roundTime: 0, // 0 = Sem limite de tempo (modo padrão para descrição)
      maxRounds: 3,
      voiceEnabled: false, // Voz começa DESLIGADA — host ativa nas regras se quiser
      reactionsEnabled: true // Reações flutuantes começam LIGADAS — host pode mutar
    },
    voiceUsers: new Set(),
    activeArtistIds: new Set(),
    activeVoterIds: new Set(),
    currentRound: 1,
    isGameOver: false
  };
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId, playerName, avatar }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const cleanPlayerName = (playerName || 'Artista').trim().slice(0, 20);

    if (!rooms[cleanRoomId]) {
      createRoom(cleanRoomId);
    }
    
    const room = rooms[cleanRoomId];

    // Check if this player is reconnecting
    const existingPlayer = Object.values(room.players).find(
      p => p.name.trim().toLowerCase() === cleanPlayerName.toLowerCase()
    );

    socket.join(cleanRoomId);

    // Cancel any pending disconnect removal for this player
    const timerKey = `${cleanRoomId}:${cleanPlayerName}`;
    if (pendingDisconnects.has(timerKey)) {
      clearTimeout(pendingDisconnects.get(timerKey));
      pendingDisconnects.delete(timerKey);
    }

    const isOldSocketAlive = existingPlayer && io.sockets.sockets.get(existingPlayer.id)?.connected;

    if (existingPlayer && !isOldSocketAlive) {
      // Re-bind to the new socket ID seamlessly
      const oldId = existingPlayer.id;
      existingPlayer.connected = true; // voltou (estava marcado como caído)
      const wasMasterBack = Boolean(existingPlayer.isMaster);
      if (oldId !== socket.id) {
        delete room.players[oldId];
        existingPlayer.id = socket.id;
        if (avatar) existingPlayer.avatar = avatar;
        if (room.hostId === oldId) {
          room.hostId = socket.id;
          existingPlayer.isHost = true;
        }
        if (room.masterId === oldId) {
          room.masterId = socket.id;
          existingPlayer.isMaster = true;
        }
        if (room.drawings && room.drawings[oldId]) {
          room.drawings[socket.id] = room.drawings[oldId];
          delete room.drawings[oldId];
        }
        if (room.votes && room.votes[oldId]) {
          room.votes[socket.id] = room.votes[oldId];
          delete room.votes[oldId];
        }
        if (room.activeArtistIds && room.activeArtistIds.has(oldId)) {
          room.activeArtistIds.delete(oldId);
          room.activeArtistIds.add(socket.id);
        }
        if (room.activeVoterIds && room.activeVoterIds.has(oldId)) {
          room.activeVoterIds.delete(oldId);
          room.activeVoterIds.add(socket.id);
        }
        if (room.voiceUsers && room.voiceUsers.has(oldId)) {
          room.voiceUsers.delete(oldId);
          room.voiceUsers.add(socket.id);
        }
        room.players[socket.id] = existingPlayer;
      }
      if (wasMasterBack && (room.state === GAME_STATES.PLAYING || room.state === GAME_STATES.VOTING)) {
        if (!room.messages) room.messages = [];
        room.messages.push({
          id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          senderId: 'system',
          senderName: 'Sistema',
          senderAvatar: '🔌',
          text: `${existingPlayer.name} reconectou e voltou para a partida!`,
          isSystem: true,
          timestamp: Date.now()
        });
      }
      io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
      socket.emit('timer_update', room.timer ?? 0);
      return;
    }
    
    // If an existing player is ALREADY connected with this name, avoid hijacking their session!
    let finalPlayerName = cleanPlayerName;
    if (existingPlayer && isOldSocketAlive && existingPlayer.id !== socket.id) {
      finalPlayerName = `${cleanPlayerName} #${Math.floor(Math.random() * 899 + 100)}`;
    }

    // Set host if this is the first player or hostId is missing
    const isFirstPlayer = Object.keys(room.players).length === 0;
    if (!room.hostId || isFirstPlayer) {
      room.hostId = socket.id;
    }

    room.players[socket.id] = {
      id: socket.id,
      name: finalPlayerName,
      avatar: avatar || '🎨',
      score: 0,
      isMaster: false,
      isHost: (socket.id === room.hostId),
      hasSubmitted: false,
      hasVoted: false,
      connected: true
    };

    // Late joiners entram como artistas/espectadores da rodada atual:
    // - No PLAYING: NÃO entram em activeArtistIds de propósito — os originais
    //   decidem o fim, e o novato ganha 20s de tolerância no modo Livre.
    // - No VOTING: NÃO entram em activeVoterIds — podem votar, mas não travam o fim.
    const phaseHint =
      room.state === GAME_STATES.PLAYING
        ? ` ${finalPlayerName} entrou no meio da rodada — veja as dicas e desenhe rápido!`
        : room.state === GAME_STATES.VOTING
          ? ` ${finalPlayerName} entrou no meio da votação — vote nos desenhos!`
          : room.state === GAME_STATES.RESULTS
            ? ` ${finalPlayerName} chegou para ver o resultado e jogar a próxima!`
            : '';

    // Add entry message to chat
    if (!room.messages) room.messages = [];
    room.messages.push({
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: '🎉',
      text: `${cleanPlayerName} entrou na sala!${phaseHint}`,
      isSystem: true,
      timestamp: Date.now()
    });

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
    // Sincroniza o timer na hora para quem entrou no meio (mobile usa para auto-submit)
    socket.emit('timer_update', room.timer ?? 0);
  });

  socket.on('send_chat_message', ({ roomId, text, playerName, avatar }) => {
    if (!roomId || !text || typeof text !== 'string') return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;

    // Anti-flood do chat: 1 mensagem a cada 600ms por pessoa
    const nowChat = Date.now();
    if (!room.lastChatAt) room.lastChatAt = {};
    if (nowChat - (room.lastChatAt[socket.id] || 0) < 600) return;
    room.lastChatAt[socket.id] = nowChat;

    // Ensure socket is joined to room
    socket.join(cleanRoomId);

    // Find player by socket.id or re-bind by playerName if socket reconnected
    let player = room.players[socket.id];
    if (player) player.connected = true;
    if (!player && playerName) {
      const existingPlayer = Object.values(room.players).find(p => p.name === playerName);
      if (existingPlayer) {
        delete room.players[existingPlayer.id];
        existingPlayer.id = socket.id;
        existingPlayer.connected = true;
        room.players[socket.id] = existingPlayer;
        player = existingPlayer;
      }
    }

    if (!player) {
      player = {
        id: socket.id,
        name: (playerName || 'Artista').trim().slice(0, 20),
        avatar: avatar || '🎨',
        score: 0,
        isMaster: false,
        isHost: (socket.id === room.hostId),
        hasSubmitted: false,
        hasVoted: false,
        connected: true
      };
      room.players[socket.id] = player;
    }

    const isHost = (socket.id === room.hostId || Boolean(player.isHost));
    if (room.isChatMuted && !isHost) {
      socket.emit('error', 'O chat está silenciado pelo Host.');
      return;
    }

    const cleanText = text.trim().slice(0, 250);
    if (!cleanText) return;

    const message = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: socket.id,
      senderName: player.name,
      senderAvatar: player.avatar || '🎨',
      text: cleanText,
      isMaster: Boolean(player.isMaster),
      isHost: isHost,
      isTip: false,
      timestamp: Date.now()
    };

    if (!room.messages) room.messages = [];
    room.messages.push(message);
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    // Broadcast both new_chat_message and room_update so every participant is 100% synchronized
    io.to(cleanRoomId).emit('new_chat_message', message);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('toggle_chat_mute', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;
    if (socket.id !== room.hostId) {
      socket.emit('error', 'Apenas o Host pode silenciar ou liberar o chat.');
      return;
    }

    room.isChatMuted = !room.isChatMuted;
    const hostPlayer = room.players[socket.id];
    const muteNotice = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: room.isChatMuted ? '🔇' : '🔊',
      text: room.isChatMuted
        ? `🔇 O Host (${hostPlayer?.name || 'Host'}) silenciou o chat da sala.`
        : `🔊 O Host (${hostPlayer?.name || 'Host'}) liberou o chat para todos!`,
      isSystem: true,
      timestamp: Date.now()
    };

    if (!room.messages) room.messages = [];
    room.messages.push(muteNotice);

    io.to(cleanRoomId).emit('new_chat_message', muteNotice);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('clear_chat', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;
    const player = room.players[socket.id];
    
    room.messages = [{
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: '🧹',
      text: `O chat foi limpo por ${player?.name || 'um jogador'}.`,
      isSystem: true,
      timestamp: Date.now()
    }];

    io.to(cleanRoomId).emit('chat_cleared');
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('start_game', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.LOBBY) return;

    if (socket.id !== room.hostId) {
      socket.emit('error', 'Apenas o Host pode iniciar a partida.');
      return;
    }

    // Pick master with rotation so everyone gets a turn and no one repeats back-to-back
    // (só conta quem está conectado — fantasma que fechou sem sair não entra)
    const playerIds = Object.values(room.players)
      .filter((p) => p.connected !== false)
      .map((p) => p.id);
    if (playerIds.length < 2) {
      socket.emit('error', 'São necessários pelo menos 2 jogadores conectados para iniciar.');
      return;
    }

    if (!room.masterHistory) room.masterHistory = [];

    // Filter connected players who haven't had a turn as master in the current rotation cycle
    let candidates = playerIds.filter(pid => !room.masterHistory.includes(pid));

    // If everyone in this cycle has been master, start a new cycle
    if (candidates.length === 0) {
      // Exclude the immediate last master if there are 2 or more players
      candidates = playerIds.filter(pid => pid !== room.lastMasterId);
      if (candidates.length === 0) candidates = playerIds;
      room.masterHistory = room.lastMasterId ? [room.lastMasterId] : [];
    }

    const masterId = candidates[Math.floor(Math.random() * candidates.length)];
    room.masterId = masterId;
    room.lastMasterId = masterId;
    room.masterHistory.push(masterId);
    
    // Reset round state
    playerIds.forEach(pid => {
      room.players[pid].isMaster = (pid === masterId);
      room.players[pid].hasSubmitted = false;
      room.players[pid].hasVoted = false;
    });
    room.drawings = {};
    room.tips = [];
    room.votes = {};
    room.voteRecords = {};
    room.character = null;
    room.activeArtistIds = new Set(playerIds.filter(pid => pid !== masterId));
    room.activeVoterIds = new Set();
    
    room.state = GAME_STATES.PLAYING;
    room.timer = Number(room.settings?.roundTime ?? 0);

    const masterPlayer = room.players[masterId];
    // Clear old chat messages for the new round and show clean start announcement.
    // chat_cleared primeiro (zera otimistas), room_update depois (traz o aviso).
    room.messages = [{
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: '👑',
      text: `Rodada ${room.currentRound} iniciada! ${masterPlayer?.name || 'Um jogador'} é o Mestre das dicas nesta rodada.`,
      isSystem: true,
      timestamp: Date.now()
    }];

    io.to(cleanRoomId).emit('chat_cleared');
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
    
    // Start Timer only if roundTime > 0
    if (room.timerInterval) clearInterval(room.timerInterval);
    if (room.timer > 0) {
      room.timerInterval = setInterval(() => {
        room.timer--;
        io.to(cleanRoomId).emit('timer_update', room.timer);
        
        if (room.timer <= 0) {
          clearInterval(room.timerInterval);
          endPlayingPhase(cleanRoomId);
        }
      }, 1000);
    } else {
      io.to(cleanRoomId).emit('timer_update', 0);
    }
  });

  socket.on('update_settings', ({ roomId, roundTime, maxRounds, voiceEnabled, reactionsEnabled }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.LOBBY) return;
    if (socket.id !== room.hostId) return;

    if (roundTime !== undefined) room.settings.roundTime = Number(roundTime);
    if (maxRounds !== undefined) room.settings.maxRounds = Number(maxRounds);
    if (reactionsEnabled !== undefined) {
      room.settings.reactionsEnabled = Boolean(reactionsEnabled);
    }
    if (voiceEnabled !== undefined) {
      room.settings.voiceEnabled = Boolean(voiceEnabled);
      if (!room.settings.voiceEnabled && room.voiceUsers && room.voiceUsers.size > 0) {
        room.voiceUsers.clear();
        io.to(cleanRoomId).emit('voice_room_disabled');
      }
    }
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('toggle_room_voice', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || socket.id !== room.hostId) return;

    room.settings.voiceEnabled = !room.settings.voiceEnabled;
    if (!room.settings.voiceEnabled && room.voiceUsers) {
      room.voiceUsers.clear();
      io.to(cleanRoomId).emit('voice_room_disabled');
    }

    const hostPlayer = room.players[socket.id];
    if (!room.messages) room.messages = [];
    room.messages.push({
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: room.settings.voiceEnabled ? '🎙️' : '🔇',
      text: room.settings.voiceEnabled
        ? `🎙️ O Host (${hostPlayer?.name || 'Host'}) ativou o chat de voz da sala!`
        : `🔇 O Host (${hostPlayer?.name || 'Host'}) desativou o chat de voz da sala.`,
      isSystem: true,
      timestamp: Date.now()
    });

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('host_toggle_user_voice_mute', ({ roomId, targetUserId }) => {
    if (!roomId || !targetUserId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || socket.id !== room.hostId) return;
    if (!room.players[targetUserId]) return;

    const targetPlayer = room.players[targetUserId];
    targetPlayer.isVoiceMutedByHost = !targetPlayer.isVoiceMutedByHost;

    io.to(targetUserId).emit('user_voice_muted_by_host', { 
      isMuted: targetPlayer.isVoiceMutedByHost 
    });

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('host_mute_all_voice', ({ roomId, muteAll }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || socket.id !== room.hostId) return;

    const shouldMute = muteAll !== undefined ? Boolean(muteAll) : true;
    Object.keys(room.players).forEach((pid) => {
      if (pid !== room.hostId) {
        room.players[pid].isVoiceMutedByHost = shouldMute;
        io.to(pid).emit('user_voice_muted_by_host', { isMuted: shouldMute });
      }
    });

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('finish_round_early', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    
    const isMaster = socket.id === room.masterId || Boolean(room.players[socket.id]?.isMaster);
    const isHost = socket.id === room.hostId || Boolean(room.players[socket.id]?.isHost);
    if (!isMaster && !isHost) return;

    if (room.timerInterval) clearInterval(room.timerInterval);
    endPlayingPhase(cleanRoomId);
  });

  // WebRTC Live Voice Chat Mesh Signaling
  socket.on('voice_join', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;
    if (room.settings?.voiceEnabled === false) {
      socket.emit('error', 'O chat de voz foi desativado pelo Host nesta sala.');
      return;
    }
    if (room.players[socket.id]?.isVoiceMutedByHost) {
      socket.emit('user_voice_muted_by_host', { isMuted: true });
    }
    if (!room.voiceUsers) room.voiceUsers = new Set();

    // Broadcast to other voice users that a new peer joined
    socket.to(cleanRoomId).emit('voice_user_joined', { userId: socket.id });

    // Send the list of existing voice users to the joining user
    const otherUsers = Array.from(room.voiceUsers).filter(id => id !== socket.id);
    socket.emit('voice_users_list', { userIds: otherUsers });

    room.voiceUsers.add(socket.id);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('voice_offer', ({ to, offer }) => {
    if (to) {
      io.to(to).emit('voice_offer', { from: socket.id, offer });
    }
  });

  socket.on('voice_answer', ({ to, answer }) => {
    if (to) {
      io.to(to).emit('voice_answer', { from: socket.id, answer });
    }
  });

  socket.on('voice_ice_candidate', ({ to, candidate }) => {
    if (to) {
      io.to(to).emit('voice_ice_candidate', { from: socket.id, candidate });
    }
  });

  // Generic webrtc_signal event for bidirectional peer signaling
  socket.on('webrtc_signal', ({ target, roomId, data }) => {
    if (target) {
      io.to(target).emit('webrtc_signal', { sender: socket.id, data });
    } else if (roomId) {
      const cleanRoomId = String(roomId).trim().toUpperCase();
      socket.to(cleanRoomId).emit('webrtc_signal', { sender: socket.id, data });
    }
  });

  socket.on('voice_leave', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (room && room.voiceUsers) {
      room.voiceUsers.delete(socket.id);
      socket.to(cleanRoomId).emit('voice_user_left', { userId: socket.id });
      io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
    }
  });

  socket.on('send_reaction', ({ roomId, emoji }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;
    // Host pode mutar as reações nas regras da sala
    if (room.settings?.reactionsEnabled === false) return;
    // Anti-flood: 1 reação por pessoa a cada 1.2s (o resto é descartado)
    const now = Date.now();
    if (!room.lastReactionAt) room.lastReactionAt = {};
    if (now - (room.lastReactionAt[socket.id] || 0) < 1200) return;
    room.lastReactionAt[socket.id] = now;
    const player = room.players[socket.id];
    io.to(cleanRoomId).emit('new_reaction', {
      id: now + Math.random(),
      emoji: String(emoji || '🎨').slice(0, 8),
      senderName: player?.name || '',
      x: Math.floor(Math.random() * 70) + 15
    });
  });

  socket.on('set_character', ({ roomId, character }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    const isMaster = socket.id === room.masterId || Boolean(room.players[socket.id]?.isMaster);
    if (!isMaster) return;
    room.character = character;
  });

  socket.on('send_tip', ({ roomId, tip }) => {
    if (!roomId || !tip || typeof tip !== 'string') return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    const isMaster = socket.id === room.masterId || Boolean(room.players[socket.id]?.isMaster);
    if (!isMaster) return;

    const cleanTip = tip.trim().slice(0, 150);
    if (!cleanTip) return;

    if (!room.tips) room.tips = [];
    room.tips.push(cleanTip);

    const tipMessage = {
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: socket.id,
      senderName: room.players[socket.id]?.name || 'Mestre',
      senderAvatar: '👑',
      text: cleanTip,
      isMaster: true,
      isTip: true,
      timestamp: Date.now()
    };

    if (!room.messages) room.messages = [];
    room.messages.push(tipMessage);
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    io.to(cleanRoomId).emit('new_tip', cleanTip);
    io.to(cleanRoomId).emit('new_chat_message', tipMessage);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('draw_line', ({ roomId, line }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    if (socket.id === room.masterId) return;

    socket.to(cleanRoomId).emit('draw_line', { playerId: socket.id, line });
  });

  socket.on('submit_drawing', ({ roomId, imageDataUrl, dataUrl }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || (room.state !== GAME_STATES.PLAYING && room.state !== GAME_STATES.VOTING)) return;
    if (!room.players[socket.id]) return;
    
    const img = imageDataUrl || dataUrl;
    if (img) {
      room.drawings[socket.id] = img;
    }
    room.players[socket.id].hasSubmitted = true;
    
    io.to(cleanRoomId).emit('player_submitted', socket.id);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
    
    // Check if artists who were present at the start of the round have all submitted
    // (desconectados sem clicar em sair NÃO contam — não travam a rodada)
    if (room.state === GAME_STATES.PLAYING) {
      const originalArtists = Object.values(room.players).filter(p => !p.isMaster && p.connected !== false && room.activeArtistIds?.has(p.id));
      const allOriginalSubmitted = originalArtists.length > 0 && originalArtists.every(p => p.hasSubmitted);
      
      const allCurrentArtists = Object.values(room.players).filter(p => !p.isMaster && p.connected !== false);
      const allCurrentSubmitted = allCurrentArtists.length > 0 && allCurrentArtists.every(p => p.hasSubmitted);
        
      if (allCurrentSubmitted || (allOriginalSubmitted && originalArtists.length === allCurrentArtists.length)) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        endPlayingPhase(cleanRoomId);
      } else if (allOriginalSubmitted && !allCurrentSubmitted) {
        // Original artists finished, but a late joiner is still drawing.
        // If round had no time limit, start a 20s countdown so original artists aren't blocked forever.
        if (!room.timerInterval && room.timer === 0) {
          room.timer = 20;
          io.to(cleanRoomId).emit('timer_update', room.timer);
          room.timerInterval = setInterval(() => {
            room.timer--;
            io.to(cleanRoomId).emit('timer_update', room.timer);
            if (room.timer <= 0) {
              clearInterval(room.timerInterval);
              endPlayingPhase(cleanRoomId);
            }
          }, 1000);
        }
      }
    }
  });

  socket.on('submit_vote', ({ roomId, type, votedPlayerId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.VOTING) return;
    if (type !== 'similar' && type !== 'funny') return;
    if (!room.players[socket.id] || !room.players[votedPlayerId]) return;
    // Não pode votar em si mesmo nem no Mestre (que não desenhou)
    if (votedPlayerId === socket.id) return;
    if (votedPlayerId === room.masterId) return;
    // Só pode votar em desenho que existe na galeria
    if (!room.drawings[votedPlayerId]) return;

    // Anti voto duplo na mesma categoria (frontend já bloqueia, backend garante)
    if (!room.voteRecords) room.voteRecords = {};
    if (!room.voteRecords[socket.id]) room.voteRecords[socket.id] = { similar: null, funny: null };
    if (room.voteRecords[socket.id][type]) return;
    room.voteRecords[socket.id][type] = votedPlayerId;

    if (!room.votes[votedPlayerId]) {
      room.votes[votedPlayerId] = { similar: 0, funny: 0 };
    }
    room.votes[votedPlayerId][type]++;
    
    if (room.players[socket.id]) {
      const rec = room.voteRecords[socket.id];
      room.players[socket.id].hasVoted = Boolean(rec.similar && rec.funny);
    }

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));

    // Check if voters who started voting have all voted (fantasmas não travam)
    const connectedPlayers = Object.values(room.players).filter(p => p.connected !== false);
    const originalVoters = connectedPlayers.filter(p => room.activeVoterIds?.has(p.id));
    const allOriginalVoted = originalVoters.length > 0 && originalVoters.every(p => p.hasVoted);
    const allCurrentVoted = connectedPlayers.length > 0 && connectedPlayers.every(p => p.hasVoted);

    if (allCurrentVoted || (allOriginalVoted && originalVoters.length === connectedPlayers.length)) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      endVotingPhase(cleanRoomId);
    }
  });

  socket.on('next_round', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.RESULTS) return;

    if (room.timerInterval) clearInterval(room.timerInterval);

    if (room.isGameOver) {
      // Reset tournament
      room.currentRound = 1;
      room.isGameOver = false;
      room.masterHistory = [];
      room.lastMasterId = null;
      Object.values(room.players).forEach(p => {
        p.score = 0;
        p.isMaster = false;
        p.hasSubmitted = false;
        p.hasVoted = false;
      });
    } else {
      room.currentRound++;
      Object.values(room.players).forEach(p => {
        p.isMaster = false;
        p.hasSubmitted = false;
        p.hasVoted = false;
      });
    }

    room.state = GAME_STATES.LOBBY;
    room.masterId = null;
    room.character = null;
    room.drawings = {};
    room.tips = [];
    room.votes = {};
    room.voteRecords = {};
    room.messages = [];

    // Nova partida = chat zerado em todo mundo (antes do estado novo chegar)
    io.to(cleanRoomId).emit('chat_cleared');
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('leave_room', ({ roomId }) => {
    if (roomId) {
      const cleanRoomId = String(roomId).trim().toUpperCase();
      const room = rooms[cleanRoomId];
      if (room && room.players[socket.id]) {
        const p = room.players[socket.id];
        const timerKey = `${cleanRoomId}:${p.name}`;
        if (pendingDisconnects.has(timerKey)) {
          clearTimeout(pendingDisconnects.get(timerKey));
          pendingDisconnects.delete(timerKey);
        }
      }
      removePlayerFromRoom(socket, cleanRoomId);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
    for (const rId in rooms) {
      const room = rooms[rId];
      if (room && room.players[socket.id]) {
        const p = room.players[socket.id];
        // Marca como caído NA HORA: fantasmas não travam desenho/votação nem host.
        // A remoção definitiva continua após 25s (graça p/ reconectar sem perder nada).
        p.connected = false;

        let extraMsg = '';
        if (room.hostId === socket.id) {
          const nextHost = Object.values(room.players).find(
            (pl) => pl.id !== socket.id && pl.connected !== false
          );
          if (nextHost) {
            room.hostId = nextHost.id;
            Object.values(room.players).forEach((pl) => { pl.isHost = (pl.id === nextHost.id); });
            extraMsg += ` 👑 ${nextHost.name} agora é o Host da sala.`;
          }
        }
        if (room.masterId === socket.id && (room.state === GAME_STATES.PLAYING || room.state === GAME_STATES.VOTING)) {
          extraMsg += ' O Mestre caiu — a rodada continua e ele pode voltar.';
        }
        if (!room.messages) room.messages = [];
        room.messages.push({
          id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          senderId: 'system',
          senderName: 'Sistema',
          senderAvatar: '🔌',
          text: `${p.name} caiu da sala (aguardando reconexão...).${extraMsg}`,
          isSystem: true,
          timestamp: Date.now()
        });
        io.to(rId).emit('room_update', getRoomPublicState(rId));

        const timerKey = `${rId}:${p.name}`;
        if (pendingDisconnects.has(timerKey)) {
          clearTimeout(pendingDisconnects.get(timerKey));
        }
        const timer = setTimeout(() => {
          pendingDisconnects.delete(timerKey);
          if (rooms[rId] && rooms[rId].players[socket.id]) {
            removePlayerFromRoom(socket, rId);
          }
        }, 25000);
        pendingDisconnects.set(timerKey, timer);
      }
    }
  });
});

function removePlayerFromRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room || !room.players[socket.id]) return;

  const leavingPlayer = room.players[socket.id];
  delete room.players[socket.id];
  socket.leave(roomId);
  socket.emit('left_room_success');

  // Clean up from voice chat if active
  if (room.voiceUsers && room.voiceUsers.has(socket.id)) {
    room.voiceUsers.delete(socket.id);
    socket.to(roomId).emit('voice_user_left', { userId: socket.id });
  }

  // If no players remain, clean up room
  if (Object.keys(room.players).length === 0) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    delete rooms[roomId];
    return;
  }

  // If host left, pass host to next remaining player
  let newHostName = '';
  if (room.hostId === socket.id) {
    const remainingIds = Object.keys(room.players);
    if (remainingIds.length > 0) {
      room.hostId = remainingIds[0];
      const newHost = room.players[room.hostId];
      if (newHost) {
        newHost.isHost = true;
        newHostName = newHost.name;
      }
    }
  }

  // Add system message
  if (!room.messages) room.messages = [];
  room.messages.push({
    id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    senderId: 'system',
    senderName: 'Sistema',
    senderAvatar: '👋',
    text: `${leavingPlayer.name} saiu da sala.${newHostName ? ` 👑 ${newHostName} agora é o Host da sala.` : ''}`,
    isSystem: true,
    timestamp: Date.now()
  });

  // If the leaving player was the Master during PLAYING or VOTING phase:
  if (room.masterId === socket.id && (room.state === GAME_STATES.PLAYING || room.state === GAME_STATES.VOTING)) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.state = GAME_STATES.LOBBY;
    room.masterId = null;
    room.character = null;
    room.drawings = {};
    room.tips = [];
    room.votes = {};
    room.voteRecords = {};
    Object.values(room.players).forEach(p => {
      p.isMaster = false;
      p.hasSubmitted = false;
      p.hasVoted = false;
    });

    room.messages.push({
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: '⚠️',
      text: `O Mestre (${leavingPlayer.name}) saiu da partida. A rodada foi encerrada e a sala retornou ao Lobby.`,
      isSystem: true,
      timestamp: Date.now()
    });

    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
    return;
  }

  // If an artist left during PLAYING phase, check if remaining artists are all done
  if (room.state === GAME_STATES.PLAYING) {
    const remainingArtists = Object.values(room.players).filter(p => !p.isMaster && p.connected !== false);
    if (remainingArtists.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      room.state = GAME_STATES.LOBBY;
      io.to(roomId).emit('room_update', getRoomPublicState(roomId));
      return;
    }
    const allSubmitted = remainingArtists.every(p => p.hasSubmitted);
    if (allSubmitted) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      endPlayingPhase(roomId);
      return;
    }
  }

  // If a player left during VOTING phase, check if remaining players all voted
  if (room.state === GAME_STATES.VOTING) {
    const remainingPlayers = Object.values(room.players).filter(p => p.connected !== false);
    const allVoted = remainingPlayers.length > 0 && remainingPlayers.every(p => p.hasVoted);
    if (allVoted) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      endVotingPhase(roomId);
      return;
    }
  }

  io.to(roomId).emit('room_update', getRoomPublicState(roomId));
}

function endPlayingPhase(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.state = GAME_STATES.VOTING;
  room.timer = 30; // 30 seconds to vote
  room.activeVoterIds = new Set(Object.keys(room.players));
  room.voteRecords = {};
  
  // reset vote tracking
  Object.values(room.players).forEach(p => p.hasVoted = false);
  
  io.to(roomId).emit('room_update', getRoomPublicState(roomId));

  if (room.timerInterval) clearInterval(room.timerInterval);
  room.timerInterval = setInterval(() => {
    room.timer--;
    io.to(roomId).emit('timer_update', room.timer);
    
    if (room.timer <= 0) {
      clearInterval(room.timerInterval);
      endVotingPhase(roomId);
    }
  }, 1000);
}

function endVotingPhase(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.state = GAME_STATES.RESULTS;
  room.activeVoterIds = new Set();
  room.activeArtistIds = new Set();
  
  // Calculate points
  Object.keys(room.votes).forEach(playerId => {
    if (room.players[playerId]) {
      const v = room.votes[playerId];
      const points = (v.similar * 10) + (v.funny * 5);
      room.players[playerId].score += points;
    }
  });

  // Check if tournament finished
  if (room.settings?.maxRounds > 0 && room.currentRound >= room.settings.maxRounds) {
    room.isGameOver = true;
  } else {
    room.isGameOver = false;
  }

  io.to(roomId).emit('room_update', getRoomPublicState(roomId));
}

function getRoomPublicState(roomId) {
  const room = rooms[roomId];
  if (!room) return null;
  return {
    id: room.id,
    state: room.state,
    players: Object.values(room.players).map(p => ({
      ...p,
      isHost: (p.id === room.hostId),
      isVoiceMutedByHost: Boolean(p.isVoiceMutedByHost),
      connected: p.connected !== false
    })),
    masterId: room.masterId,
    hostId: room.hostId,
    isChatMuted: Boolean(room.isChatMuted),
    isVoiceDisabled: room.settings?.voiceEnabled === false,
    isReactionsDisabled: room.settings?.reactionsEnabled === false,
    character: room.state === GAME_STATES.RESULTS ? room.character : null,
    tips: room.tips || [],
    messages: room.messages || [],
    drawings: room.state === GAME_STATES.PLAYING ? {} : room.drawings,
    votes: room.votes || {},
    settings: room.settings,
    timer: room.timer ?? 0,
    voiceUserIds: Array.from(room.voiceUsers || []),
    currentRound: room.currentRound,
    isGameOver: room.isGameOver
  };
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
