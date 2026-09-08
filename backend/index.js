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
    character: null,
    drawings: {}, // { playerId: imageDataUrl }
    tips: [],
    messages: [], // Live chat messages for all players
    votes: {}, // { playerId: { similar: count, funny: count } }
    timer: 0,
    timerInterval: null,
    settings: {
      roundTime: 0, // 0 = Sem limite de tempo (modo padrão para descrição)
      maxRounds: 3
    },
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
    if (room.state !== GAME_STATES.LOBBY) {
      socket.emit('error', 'Partida em andamento nesta sala. Aguarde ela terminar para entrar.');
      return;
    }

    socket.join(cleanRoomId);
    
    // Set host if this is the first player or hostId is missing
    const isFirstPlayer = Object.keys(room.players).length === 0;
    if (!room.hostId || isFirstPlayer) {
      room.hostId = socket.id;
    }

    room.players[socket.id] = {
      id: socket.id,
      name: cleanPlayerName,
      avatar: avatar || '🎨',
      score: 0,
      isMaster: false,
      isHost: (socket.id === room.hostId),
      hasSubmitted: false,
      hasVoted: false
    };

    // Add entry message to chat
    if (!room.messages) room.messages = [];
    room.messages.push({
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: '🎉',
      text: `${cleanPlayerName} entrou na sala!`,
      isSystem: true,
      timestamp: Date.now()
    });

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('send_chat_message', ({ roomId, text }) => {
    if (!roomId || !text || typeof text !== 'string') return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;

    const isHost = socket.id === room.hostId;
    if (room.isChatMuted && !isHost) {
      socket.emit('error', 'O chat está silenciado pelo Host.');
      return;
    }

    const player = room.players[socket.id];
    if (!player) return;

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
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    io.to(cleanRoomId).emit('new_chat_message', message);
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

  socket.on('start_game', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.LOBBY) return;

    if (socket.id !== room.hostId) {
      socket.emit('error', 'Apenas o Host pode iniciar a partida.');
      return;
    }

    // Pick a random master
    const playerIds = Object.keys(room.players);
    if (playerIds.length < 2) {
      socket.emit('error', 'São necessários pelo menos 2 jogadores para iniciar.');
      return;
    }

    const masterId = playerIds[Math.floor(Math.random() * playerIds.length)];
    room.masterId = masterId;
    
    // Reset round state
    playerIds.forEach(pid => {
      room.players[pid].isMaster = (pid === masterId);
      room.players[pid].hasSubmitted = false;
      room.players[pid].hasVoted = false;
    });
    room.drawings = {};
    room.tips = [];
    room.votes = {};
    room.character = null;
    
    room.state = GAME_STATES.PLAYING;
    room.timer = Number(room.settings?.roundTime ?? 0);

    const masterPlayer = room.players[masterId];
    if (!room.messages) room.messages = [];
    room.messages.push({
      id: Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'Sistema',
      senderAvatar: '👑',
      text: `Rodada iniciada! ${masterPlayer?.name || 'Um jogador'} é o Mestre desta rodada.`,
      isSystem: true,
      timestamp: Date.now()
    });

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

  socket.on('update_settings', ({ roomId, roundTime, maxRounds }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.LOBBY) return;

    if (roundTime !== undefined) room.settings.roundTime = Number(roundTime);
    if (maxRounds !== undefined) room.settings.maxRounds = Number(maxRounds);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('finish_round_early', ({ roomId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    
    const isMaster = socket.id === room.masterId;
    const isHost = Object.keys(room.players)[0] === socket.id;
    if (!isMaster && !isHost) return;

    if (room.timerInterval) clearInterval(room.timerInterval);
    endPlayingPhase(cleanRoomId);
  });

  socket.on('send_reaction', ({ roomId, emoji }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room) return;
    const player = room.players[socket.id];
    io.to(cleanRoomId).emit('new_reaction', {
      id: Date.now() + Math.random(),
      emoji,
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
    if (room.messages.length > 100) {
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

  socket.on('submit_drawing', ({ roomId, imageDataUrl }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    if (!room.players[socket.id]) return;
    
    room.drawings[socket.id] = imageDataUrl;
    room.players[socket.id].hasSubmitted = true;
    
    io.to(cleanRoomId).emit('player_submitted', socket.id);
    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
    
    // Check if all artists submitted
    const allSubmitted = Object.values(room.players)
      .filter(p => !p.isMaster)
      .every(p => p.hasSubmitted);
      
    if (allSubmitted) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      endPlayingPhase(cleanRoomId);
    }
  });

  socket.on('submit_vote', ({ roomId, type, votedPlayerId }) => {
    if (!roomId) return;
    const cleanRoomId = String(roomId).trim().toUpperCase();
    const room = rooms[cleanRoomId];
    if (!room || room.state !== GAME_STATES.VOTING) return;

    if (!room.votes[votedPlayerId]) {
      room.votes[votedPlayerId] = { similar: 0, funny: 0 };
    }
    room.votes[votedPlayerId][type]++;
    
    if (room.players[socket.id]) {
      room.players[socket.id].hasVoted = true;
    }

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));

    // Check if everyone voted
    const allVoted = Object.values(room.players).every(p => p.hasVoted);
    if (allVoted) {
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

    io.to(cleanRoomId).emit('room_update', getRoomPublicState(cleanRoomId));
  });

  socket.on('leave_room', ({ roomId }) => {
    if (roomId) {
      removePlayerFromRoom(socket, String(roomId).trim().toUpperCase());
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const rId in rooms) {
      if (rooms[rId].players[socket.id]) {
        removePlayerFromRoom(socket, rId);
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
    const remainingArtists = Object.values(room.players).filter(p => !p.isMaster);
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
    const remainingPlayers = Object.values(room.players);
    const allVoted = remainingPlayers.every(p => p.hasVoted);
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
      isHost: (p.id === room.hostId)
    })),
    masterId: room.masterId,
    hostId: room.hostId,
    isChatMuted: Boolean(room.isChatMuted),
    character: room.state === GAME_STATES.RESULTS ? room.character : null,
    tips: room.tips || [],
    messages: room.messages || [],
    drawings: room.state === GAME_STATES.PLAYING ? {} : room.drawings,
    votes: room.votes || {},
    settings: room.settings,
    currentRound: room.currentRound,
    isGameOver: room.isGameOver
  };
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
