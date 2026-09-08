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
    masterId: null,
    character: null,
    drawings: {}, // { playerId: imageDataUrl }
    tips: [],
    votes: {}, // { playerId: { similar: count, funny: count } }
    timer: 0,
    timerInterval: null,
    settings: {
      roundTime: 90,
      maxRounds: 3
    },
    currentRound: 1,
    isGameOver: false
  };
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId, playerName, avatar }) => {
    if (!rooms[roomId]) {
      createRoom(roomId);
    }
    
    const room = rooms[roomId];
    if (room.state !== GAME_STATES.LOBBY) {
      socket.emit('error', 'Game already in progress');
      return;
    }

    socket.join(roomId);
    
    room.players[socket.id] = {
      id: socket.id,
      name: playerName,
      avatar: avatar || '🎨',
      score: 0,
      isMaster: false,
      hasSubmitted: false
    };

    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
  });

  socket.on('start_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.LOBBY) return;

    // Pick a random master
    const playerIds = Object.keys(room.players);
    if (playerIds.length < 2) {
      socket.emit('error', 'Need at least 2 players');
      return;
    }

    const masterId = playerIds[Math.floor(Math.random() * playerIds.length)];
    room.masterId = masterId;
    
    // reset round state
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
    room.timer = room.settings?.roundTime || 90; // Configured seconds to draw

    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
    
    // Start Timer
    room.timerInterval = setInterval(() => {
      room.timer--;
      io.to(roomId).emit('timer_update', room.timer);
      
      if (room.timer <= 0) {
        clearInterval(room.timerInterval);
        endPlayingPhase(roomId);
      }
    }, 1000);
  });

  socket.on('update_settings', ({ roomId, roundTime, maxRounds }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.LOBBY) return;
    if (roundTime) room.settings.roundTime = Number(roundTime);
    if (maxRounds !== undefined) room.settings.maxRounds = Number(maxRounds);
    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
  });

  socket.on('send_reaction', ({ roomId, emoji }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players[socket.id];
    io.to(roomId).emit('new_reaction', {
      id: Date.now() + Math.random(),
      emoji,
      senderName: player?.name || '',
      x: Math.floor(Math.random() * 70) + 15 // percentage from left
    });
  });

  socket.on('set_character', ({ roomId, character }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    if (socket.id !== room.masterId) return;
    room.character = character;
  });

  socket.on('send_tip', ({ roomId, tip }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    if (socket.id !== room.masterId) return;

    room.tips.push(tip);
    io.to(roomId).emit('new_tip', tip);
    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
  });

  // Client updates drawing periodically or just final
  socket.on('draw_line', ({ roomId, line }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    if (socket.id === room.masterId) return; // Master doesn't draw

    // Broadcast line to others (optional, if we want to see live drawing)
    socket.to(roomId).emit('draw_line', { playerId: socket.id, line });
  });

  socket.on('submit_drawing', ({ roomId, imageDataUrl }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.PLAYING) return;
    if (!room.players[socket.id]) return;
    
    room.drawings[socket.id] = imageDataUrl;
    room.players[socket.id].hasSubmitted = true;
    
    io.to(roomId).emit('player_submitted', socket.id);
    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
    
    // Check if everyone submitted
    const allSubmitted = Object.values(room.players)
      .filter(p => !p.isMaster)
      .every(p => p.hasSubmitted);
      
    if (allSubmitted) {
      clearInterval(room.timerInterval);
      endPlayingPhase(roomId);
    }
  });

  socket.on('submit_vote', ({ roomId, type, votedPlayerId }) => {
    // type: 'similar' | 'funny'
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.VOTING) return;

    if (!room.votes[votedPlayerId]) {
      room.votes[votedPlayerId] = { similar: 0, funny: 0 };
    }
    room.votes[votedPlayerId][type]++;
    
    // Mark voter as done
    if (room.players[socket.id]) {
      room.players[socket.id].hasVoted = true;
    }

    io.to(roomId).emit('room_update', getRoomPublicState(roomId));

    // Check if everyone voted
    const allVoted = Object.values(room.players).every(p => p.hasVoted);
    if (allVoted) {
      clearInterval(room.timerInterval);
      endVotingPhase(roomId);
    }
  });

  socket.on('next_round', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.state !== GAME_STATES.RESULTS) return;

    if (room.isGameOver) {
      // Reset tournament
      room.currentRound = 1;
      room.isGameOver = false;
      Object.values(room.players).forEach(p => p.score = 0);
    } else {
      room.currentRound++;
    }

    room.state = GAME_STATES.LOBBY;
    room.character = null;
    io.to(roomId).emit('room_update', getRoomPublicState(roomId));
  });

  socket.on('leave_room', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      delete room.players[socket.id];
      socket.leave(roomId);
      
      if (Object.keys(room.players).length === 0) {
        clearInterval(room.timerInterval);
        delete rooms[roomId];
      } else {
        io.to(roomId).emit('room_update', getRoomPublicState(roomId));
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Cleanup player from rooms
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        
        if (Object.keys(room.players).length === 0) {
          clearInterval(room.timerInterval);
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('room_update', getRoomPublicState(roomId));
        }
      }
    }
  });
});

function endPlayingPhase(roomId) {
  const room = rooms[roomId];
  room.state = GAME_STATES.VOTING;
  room.timer = 30; // 30 seconds to vote
  
  // reset vote tracking
  Object.values(room.players).forEach(p => p.hasVoted = false);
  
  io.to(roomId).emit('room_update', getRoomPublicState(roomId));

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
  room.state = GAME_STATES.RESULTS;
  
  // Calculate points
  Object.keys(room.votes).forEach(playerId => {
    if (room.players[playerId]) {
      // e.g. 10 points for each vote
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
    players: Object.values(room.players),
    masterId: room.masterId,
    character: room.state === GAME_STATES.RESULTS ? room.character : null,
    tips: room.tips,
    drawings: room.state === GAME_STATES.PLAYING ? {} : room.drawings, // Hide drawings until voting
    votes: room.votes,
    settings: room.settings,
    currentRound: room.currentRound,
    isGameOver: room.isGameOver
  };
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
