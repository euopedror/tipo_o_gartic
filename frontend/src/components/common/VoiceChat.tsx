import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff, 
  Users, AlertCircle, Headphones, Sliders, Sparkles
} from 'lucide-react';
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
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0); // 0 to 100
  const [masterVolume, setMasterVolume] = useState(100); // 0 to 100
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>({});
  const [voicePeerIds, setVoicePeerIds] = useState<string[]>([]);
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoopbackTesting, setIsLoopbackTesting] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const peerAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const loopbackAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;
  const isDeafenedRef = useRef(false);
  isDeafenedRef.current = isDeafened;
  const masterVolumeRef = useRef(100);
  masterVolumeRef.current = masterVolume;
  const peerVolumesRef = useRef<Record<string, number>>({});
  peerVolumesRef.current = peerVolumes;

  // Apply volume calculation to a specific peer's audio element
  const applyAudioElementVolume = useCallback((peerId: string) => {
    const el = audioElementsRef.current.get(peerId);
    if (!el) return;
    if (isDeafenedRef.current) {
      el.volume = 0;
    } else {
      const pVol = peerVolumesRef.current[peerId] ?? 100;
      const combined = (pVol / 100) * (masterVolumeRef.current / 100);
      el.volume = Math.max(0, Math.min(1, combined));
    }
  }, []);

  // Update volume for a specific remote peer
  const handleSetPeerVolume = (peerId: string, vol: number) => {
    setPeerVolumes((prev) => {
      const next = { ...prev, [peerId]: vol };
      peerVolumesRef.current = next;
      applyAudioElementVolume(peerId);
      return next;
    });
  };

  // Update master incoming volume
  const handleSetMasterVolume = (vol: number) => {
    setMasterVolume(vol);
    masterVolumeRef.current = vol;
    audioElementsRef.current.forEach((_, pid) => {
      applyAudioElementVolume(pid);
    });
  };

  // Toggle Deafen (mute incoming audio from everyone)
  const handleToggleDeafen = () => {
    sounds.playClick();
    const next = !isDeafened;
    setIsDeafened(next);
    isDeafenedRef.current = next;
    audioElementsRef.current.forEach((_, pid) => {
      applyAudioElementVolume(pid);
    });
  };

  // Setup analyser for a remote peer track to detect when they speak
  const attachPeerAudioAnalyser = (peerId: string, stream: MediaStream) => {
    if (!audioContextRef.current) return;
    try {
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      peerAnalysersRef.current.set(peerId, analyser);
    } catch (e) {
      console.warn('Could not attach remote audio analyser:', e);
    }
  };

  // Helper to create and configure a PeerConnection for a specific remote peer
  const createPeerConnection = (peerId: string) => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerId, pc);

    // Add our local audio track
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

    // When remote track arrives, play it through hidden audio element
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
      applyAudioElementVolume(peerId);
      audioEl.play().catch((err) => {
        console.warn('Audio auto-play blocked by browser policy:', err);
      });

      attachPeerAudioAnalyser(peerId, event.streams[0]);
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
    peerAnalysersRef.current.delete(peerId);
    setSpeakingPeers((prev) => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
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
      // 1. Request microphone permission
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
      setIsDeafened(false);
      sounds.playPop();

      // 2. Setup AudioContext and level analyzers
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.4;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        localAnalyserRef.current = analyser;

        const localData = new Uint8Array(analyser.frequencyBinCount);
        const peerData = new Uint8Array(64);

        const analyzeAudio = () => {
          // Check local microphone
          if (localAnalyserRef.current && !isMutedRef.current) {
            localAnalyserRef.current.getByteFrequencyData(localData);
            const sum = localData.reduce((acc, val) => acc + val, 0);
            const avg = sum / localData.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setMicVolumeLevel(normalized);
            setIsSpeaking(normalized > 12);
          } else {
            setMicVolumeLevel(0);
            setIsSpeaking(false);
          }

          // Check remote peers speaking activity
          const currentlySpeaking = new Set<string>();
          peerAnalysersRef.current.forEach((pAnalyser, pid) => {
            pAnalyser.getByteFrequencyData(peerData);
            const pSum = peerData.reduce((acc, val) => acc + val, 0);
            const pAvg = pSum / peerData.length;
            if (pAvg > 14) {
              currentlySpeaking.add(pid);
            }
          });
          setSpeakingPeers(currentlySpeaking);

          animationFrameRef.current = requestAnimationFrame(analyzeAudio);
        };
        analyzeAudio();
      } catch (audioErr) {
        console.warn('Audio analyzer setup error:', audioErr);
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
        if (nextMuted) {
          setIsSpeaking(false);
          setMicVolumeLevel(0);
        }
      }
    }
  };

  // Toggle Local Loopback (Hear Yourself Test)
  const handleToggleLoopbackTest = () => {
    sounds.playClick();
    if (!localStreamRef.current) return;

    if (!isLoopbackTesting) {
      let loopEl = loopbackAudioRef.current;
      if (!loopEl) {
        loopEl = document.createElement('audio');
        loopEl.autoplay = true;
        document.body.appendChild(loopEl);
        loopbackAudioRef.current = loopEl;
      }
      loopEl.srcObject = localStreamRef.current;
      loopEl.volume = 0.8;
      loopEl.play().catch(() => {});
      setIsLoopbackTesting(true);
    } else {
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.srcObject = null;
        loopbackAudioRef.current.remove();
        loopbackAudioRef.current = null;
      }
      setIsLoopbackTesting(false);
    }
  };

  // Leave Voice Call
  const handleLeaveVoice = () => {
    sounds.playPop();
    setIsInVoice(false);
    setIsMuted(false);
    setIsDeafened(false);
    setIsSpeaking(false);
    setMicVolumeLevel(0);
    setIsExpanded(false);
    setIsLoopbackTesting(false);

    if (loopbackAudioRef.current) {
      loopbackAudioRef.current.srcObject = null;
      loopbackAudioRef.current.remove();
      loopbackAudioRef.current = null;
    }

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
    peerAnalysersRef.current.clear();

    setVoicePeerIds([]);
    setSpeakingPeers(new Set());
    socket.emit('voice_leave', { roomId });
  };

  // Socket signaling listeners for WebRTC
  useEffect(() => {
    if (!isInVoice) return;

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

    const handleVoiceUserJoined = ({ userId }: { userId: string }) => {
      setVoicePeerIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
      createPeerConnection(userId);
    };

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

    const handleVoiceUserLeft = ({ userId }: { userId: string }) => {
      cleanupPeer(userId);
    };

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
      if (loopbackAudioRef.current) {
        loopbackAudioRef.current.srcObject = null;
        loopbackAudioRef.current.remove();
      }
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
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600/30 to-pink-600/30 hover:from-violet-600/50 hover:to-pink-600/50 border border-violet-400/50 px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-all active:scale-95 shadow-md group"
          title="Entrar na chamada de voz ao vivo (P2P)"
        >
          <PhoneCall className="w-3.5 h-3.5 text-accent-cyan group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-display">Voz ao Vivo</span>
          <span className="text-[9px] bg-accent-cyan/20 text-accent-cyan px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
            Ligar Mic
          </span>
          {activeVoicePlayers.length > 0 && (
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded-full border border-emerald-500/30">
              {activeVoicePlayers.length} online
            </span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-500/60 p-1 rounded-full text-xs font-bold text-white shadow-xl backdrop-blur">
          {/* Live Speaking Indicator / Expand Drawer */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 pl-2 pr-1.5 py-0.5 hover:bg-emerald-900/40 rounded-full transition-colors select-none"
            title="Abrir painel de volume e participantes"
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isSpeaking && !isMuted ? 'bg-emerald-400 scale-125 shadow-[0_0_8px_#34d399]' : 'bg-emerald-500'
                }`}
              />
              {isSpeaking && !isMuted && (
                <span className="absolute w-4 h-4 rounded-full bg-emerald-400/50 animate-ping" />
              )}
            </div>
            <span className="text-[11px] font-mono text-emerald-300 font-black hidden sm:inline">
              Voz ({activeVoicePlayers.length})
            </span>
            <Sliders className="w-3.5 h-3.5 text-emerald-300/80 hover:text-white" />
          </button>

          {/* Mute Microphone Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-full transition-all ${
              isMuted
                ? 'bg-red-500/30 text-red-300 hover:bg-red-500/50 border border-red-500/40'
                : 'bg-panel-light text-emerald-300 hover:bg-emerald-900/40'
            }`}
            title={isMuted ? 'Desmutar microfone (Ativar áudio)' : 'Mutar microfone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Deafen Button (Mute incoming audio) */}
          <button
            type="button"
            onClick={handleToggleDeafen}
            className={`p-1.5 rounded-full transition-all ${
              isDeafened
                ? 'bg-red-500/30 text-red-300 hover:bg-red-500/50 border border-red-500/40'
                : 'bg-panel-light text-emerald-300 hover:bg-emerald-900/40'
            }`}
            title={isDeafened ? 'Desensurdecer (Ouvir todos)' : 'Ensurdecer (Silenciar áudio de todos)'}
          >
            {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Leave Voice Button */}
          <button
            type="button"
            onClick={handleLeaveVoice}
            className="p-1.5 rounded-full bg-red-600/30 hover:bg-red-600/60 text-red-300 transition-colors border border-red-500/30"
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
            className="absolute top-12 right-0 z-50 bg-red-950/95 border border-red-500 text-red-200 text-xs p-3 rounded-2xl shadow-2xl flex items-start gap-2 max-w-xs"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="block mt-1 text-[10px] underline text-red-300 hover:text-white font-bold"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Voice Controls & Participants Drawer */}
      <AnimatePresence>
        {isInVoice && isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-12 right-0 z-50 bg-panel/98 border border-border/90 p-4 rounded-3xl shadow-2xl w-80 max-w-[calc(100vw-2rem)] backdrop-blur-md text-xs space-y-3.5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border/80 text-text-muted text-[11px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-accent-cyan" />
                <span>Painel de Voz P2P</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-text-muted hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Master Volume Slider */}
            <div className="bg-black/40 border border-border/70 p-3 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Headphones className="w-3.5 h-3.5 text-accent-cyan" />
                  Volume Geral da Chamada
                </span>
                <span className="font-mono text-accent-cyan">{masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => handleSetMasterVolume(Number(e.target.value))}
                className="w-full accent-accent-cyan h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Local Microphone Live Meter & Test */}
            <div className="bg-black/40 border border-border/70 p-3 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Mic className="w-3.5 h-3.5 text-accent-green" />
                  Seu Microfone
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isMuted ? 'bg-red-500/20 text-red-300' : isSpeaking ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isMuted ? 'Mutado' : isSpeaking ? 'Falando 🎙️' : 'Pronto'}
                </span>
              </div>

              {/* Dynamic VU meter bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div 
                  className={`h-full transition-all duration-75 ${
                    isMuted ? 'bg-slate-600' : micVolumeLevel > 60 ? 'bg-accent-yellow' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${isMuted ? 0 : micVolumeLevel}%` }}
                />
              </div>

              {/* Loopback Mic Test Button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleLoopbackTest}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1.5 ${
                    isLoopbackTesting 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm animate-pulse' 
                      : 'bg-panel-light border-border/80 text-text-muted hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-accent-yellow" />
                  <span>{isLoopbackTesting ? 'Ouvindo Seu Retorno (Clique p/ Parar)' : 'Testar Meu Microfone (Ouvir Retorno)'}</span>
                </button>
              </div>
            </div>

            {/* Participants list with individual volume sliders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <span>Participantes ({activeVoicePlayers.length})</span>
                <span>Volume Individual</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeVoicePlayers.map((p) => {
                  const isMe = p.id === socket.id || (Boolean(myPlayer?.name) && p.name === myPlayer?.name);
                  const isPeerSpeaking = isMe ? (isSpeaking && !isMuted) : speakingPeers.has(p.id);
                  const pVol = peerVolumes[p.id] ?? 100;

                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-2xl bg-black/30 border transition-all ${
                        isPeerSpeaking
                          ? 'border-emerald-500/80 shadow-[0_0_12px_rgba(52,211,153,0.15)] bg-emerald-950/20'
                          : 'border-border/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xl transition-transform ${
                              isPeerSpeaking ? 'scale-125' : ''
                            }`}
                          >
                            {p.avatar || '🎨'}
                          </span>
                          <span className="font-bold text-white text-xs truncate max-w-[120px]">
                            {p.name} {isMe && <span className="text-primary text-[10px]">(Você)</span>}
                          </span>
                        </div>

                        {/* Speaking badge */}
                        <div className="flex items-center gap-1">
                          {isMe ? (
                            isMuted ? (
                              <span className="text-[10px] text-red-400 bg-red-500/20 px-2 py-0.5 rounded-md font-bold">
                                Mutado
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md font-bold">
                                Ativo
                              </span>
                            )
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              isPeerSpeaking ? 'bg-emerald-500/30 text-emerald-300 animate-pulse' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isPeerSpeaking ? 'Falando 🔊' : 'Ouvindo'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Volume Slider for Remote Peer */}
                      {!isMe && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          <Volume2 className="w-3 h-3 text-text-muted shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={pVol}
                            onChange={(e) => handleSetPeerVolume(p.id, Number(e.target.value))}
                            className="w-full accent-primary h-1 bg-slate-800 rounded cursor-pointer"
                            title={`Ajustar volume de ${p.name}`}
                          />
                          <span className="text-[10px] font-mono text-text-muted shrink-0 w-7 text-right">
                            {pVol}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
