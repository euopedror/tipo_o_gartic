import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneCall, PhoneOff, Users, AlertCircle } from 'lucide-react';
import type { Player } from '../../types';
import { sounds } from '../../utils/audioFx';

interface VoiceChatProps {
  socket: Socket;
  roomId: string;
  players: Player[];
  myPlayer?: Player;
  voiceUserIds?: string[];
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export default function VoiceChat({
  socket,
  roomId,
  players,
  myPlayer,
  voiceUserIds: serverVoiceUserIds = [],
}: VoiceChatProps) {
  const [isInVoice, setIsInVoice] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicePeerIds, setVoicePeerIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMutedRef = useRef(false);

  isMutedRef.current = isMuted;

  // Helper to create and configure a PeerConnection for a specific remote peer
  const createPeerConnection = (peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);

    // Add our local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice_ice_candidate', {
          to: peerId,
          candidate: event.candidate,
        });
      }
    };

    // When remote track arrives, play it
    pc.ontrack = (event) => {
      let audioEl = audioElementsRef.current.get(peerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.setAttribute('playsinline', 'true');
        document.body.appendChild(audioEl);
        audioElementsRef.current.set(peerId, audioEl);
      }
      audioEl.srcObject = event.streams[0];
      audioEl.play().catch((err) => {
        console.warn('Audio auto-play blocked:', err);
      });
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        cleanupPeer(peerId);
      }
    };

    return pc;
  };

  const cleanupPeer = (peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    const audioEl = audioElementsRef.current.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      audioElementsRef.current.delete(peerId);
    }
    setVoicePeerIds((prev) => prev.filter((id) => id !== peerId));
  };

  // Join Voice Call
  const handleJoinVoice = async () => {
    sounds.playClick();
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Seu navegador não suporta captura de microfone ou conexão segura (HTTPS).');
      return;
    }

    try {
      // 1. Request microphone permission with audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setIsInVoice(true);
      setIsMuted(false);
      sounds.playPop();

      // 2. Setup speech level analyzer for visual feedback
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!analyserRef.current || isMutedRef.current) {
            setIsSpeaking(false);
          } else {
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((acc, val) => acc + val, 0);
            const avg = sum / dataArray.length;
            setIsSpeaking(avg > 18);
          }
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (audioErr) {
        console.warn('Audio analyzer not available:', audioErr);
      }

      // 3. Inform server we entered voice
      socket.emit('voice_join', { roomId });
    } catch (err: unknown) {
      console.error('Error accessing microphone:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Permission denied') || message.includes('NotAllowedError')) {
        setErrorMsg('Permissão de microfone negada. Permita o acesso nas configurações do navegador.');
      } else {
        setErrorMsg('Não foi possível acessar o microfone.');
      }
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    sounds.playClick();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const nextMuted = !isMuted;
        audioTrack.enabled = !nextMuted;
        setIsMuted(nextMuted);
        if (nextMuted) setIsSpeaking(false);
      }
    }
  };

  // Leave Voice Call
  const handleLeaveVoice = () => {
    sounds.playPop();
    setIsInVoice(false);
    setIsMuted(false);
    setIsSpeaking(false);
    setIsExpanded(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    audioElementsRef.current.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current.clear();

    setVoicePeerIds([]);
    socket.emit('voice_leave', { roomId });
  };

  // Socket signaling listeners for WebRTC
  useEffect(() => {
    if (!isInVoice) return;

    // 1. We joined: Server sends us the list of other peers currently in voice
    const handleVoiceUsersList = async ({ userIds }: { userIds: string[] }) => {
      setVoicePeerIds(userIds);

      for (const peerId of userIds) {
        try {
          const pc = createPeerConnection(peerId);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
          });
          await pc.setLocalDescription(offer);

          socket.emit('voice_offer', {
            to: peerId,
            offer,
          });
        } catch (err) {
          console.error(`Error creating offer to peer ${peerId}:`, err);
        }
      }
    };

    // 2. Another user joined voice
    const handleVoiceUserJoined = ({ userId }: { userId: string }) => {
      setVoicePeerIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      createPeerConnection(userId);
    };

    // 3. Received offer from a peer
    const handleVoiceOffer = async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice_answer', {
          to: from,
          answer,
        });

        setVoicePeerIds((prev) => (prev.includes(from) ? prev : [...prev, from]));
      } catch (err) {
        console.error(`Error handling offer from ${from}:`, err);
      }
    };

    // 4. Received answer from a peer
    const handleVoiceAnswer = async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error(`Error setting remote description from ${from}:`, err);
      }
    };

    // 5. ICE candidate arrived
    const handleVoiceIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error(`Error adding ICE candidate from ${from}:`, err);
      }
    };

    // 6. User left voice
    const handleVoiceUserLeft = ({ userId }: { userId: string }) => {
      cleanupPeer(userId);
    };

    // 7. Generic webrtc_signal fallback
    const handleGenericSignal = async ({ sender, data }: { sender: string; data: any }) => {
      if (!data || !sender || sender === socket.id) return;
      try {
        if (data.sdp) {
          const pc = createPeerConnection(sender);
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_signal', { target: sender, data: { sdp: answer } });
          }
        } else if (data.candidate) {
          const pc = peerConnectionsRef.current.get(sender);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (err) {
        console.error(`Error processing generic WebRTC signal from ${sender}:`, err);
      }
    };

    socket.on('voice_users_list', handleVoiceUsersList);
    socket.on('voice_user_joined', handleVoiceUserJoined);
    socket.on('voice_offer', handleVoiceOffer);
    socket.on('voice_answer', handleVoiceAnswer);
    socket.on('voice_ice_candidate', handleVoiceIceCandidate);
    socket.on('voice_user_left', handleVoiceUserLeft);
    socket.on('webrtc_signal', handleGenericSignal);

    return () => {
      socket.off('voice_users_list', handleVoiceUsersList);
      socket.off('voice_user_joined', handleVoiceUserJoined);
      socket.off('voice_offer', handleVoiceOffer);
      socket.off('voice_answer', handleVoiceAnswer);
      socket.off('voice_ice_candidate', handleVoiceIceCandidate);
      socket.off('voice_user_left', handleVoiceUserLeft);
      socket.off('webrtc_signal', handleGenericSignal);
    };
  }, [isInVoice, socket]);

  // Clean up all media on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      audioElementsRef.current.forEach((el) => {
        el.srcObject = null;
        el.remove();
      });
    };
  }, []);

  // Voice users player representations
  const activeVoiceUserIds = Array.from(
    new Set([...voicePeerIds, ...serverVoiceUserIds, ...(isInVoice ? [socket.id || ''] : [])])
  ).filter(Boolean);

  const activeVoicePlayers = players.filter((p) => activeVoiceUserIds.includes(p.id));

  return (
    <div className="relative">
      {/* Primary Voice Pill */}
      {!isInVoice ? (
        <button
          type="button"
          onClick={handleJoinVoice}
          className="flex items-center gap-1.5 bg-panel-light hover:bg-violet-600/30 border border-violet-500/40 px-3 py-1.5 rounded-full text-xs font-bold text-violet-200 transition-all active:scale-95 shadow-sm group"
          title="Entrar na sala de voz ao vivo (P2P)"
        >
          <PhoneCall className="w-3.5 h-3.5 text-accent-cyan group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Voz ao Vivo</span>
          <span className="text-[9px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider">
            P2P
          </span>
          {activeVoicePlayers.length > 0 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded-full">
              {activeVoicePlayers.length}
            </span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/50 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-lg backdrop-blur">
          {/* Live Indicator / Expand Toggle */}
          <div
            className="flex items-center gap-1.5 pl-1 pr-1 cursor-pointer select-none"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Ver participantes na voz"
          >
            <span
              className={`w-2 h-2 rounded-full transition-transform ${
                isSpeaking && !isMuted ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span className="text-[11px] font-mono text-emerald-300 font-bold hidden sm:inline">
              Voz ({activeVoicePlayers.length})
            </span>
          </div>

          {/* Mute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-full transition-colors ${
              isMuted
                ? 'bg-red-500/30 text-red-300 hover:bg-red-500/40'
                : 'bg-panel-light text-emerald-300 hover:bg-panel'
            }`}
            title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Leave Voice Button */}
          <button
            type="button"
            onClick={handleLeaveVoice}
            className="p-1.5 rounded-full bg-red-600/30 hover:bg-red-600/50 text-red-300 transition-colors"
            title="Sair da chamada de voz"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error message toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-10 right-0 z-50 bg-red-950/95 border border-red-500 text-red-200 text-xs p-3 rounded-2xl shadow-2xl flex items-start gap-2 max-w-xs"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="block mt-1 text-[10px] underline text-red-300 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Voice Participants Drawer / Popover */}
      <AnimatePresence>
        {isInVoice && isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-11 right-0 z-50 bg-panel border border-border/90 p-3 rounded-2xl shadow-2xl w-64 text-xs"
          >
            <div className="flex items-center justify-between mb-2 text-text-muted text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Na chamada de voz</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-text-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {activeVoicePlayers.map((p) => {
                const isMe = p.id === socket.id || (Boolean(myPlayer?.name) && p.name === myPlayer?.name);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-1.5 rounded-xl bg-black/30 border border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg transition-transform ${
                          isMe && isSpeaking && !isMuted ? 'scale-125' : ''
                        }`}
                      >
                        {p.avatar || '🎨'}
                      </span>
                      <span className="font-bold text-white text-xs truncate max-w-[120px]">
                        {p.name} {isMe && '(Você)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isMe && isMuted ? (
                        <span className="text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded font-bold">
                          Mutado
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                          Ativo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
