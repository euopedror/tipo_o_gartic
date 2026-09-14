import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff, 
  Users, AlertCircle, Headphones, Sliders, Sparkles
} from 'lucide-react';
import type { Player } from '../../types';
import { sounds } from '../../utils/audioFx';
import AvatarIcon from './AvatarIcon';

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
          className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-yellow-50 border-2 border-zinc-900 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-bold text-zinc-900 transition-all active:scale-95 shadow-[2px_2px_0px_#18181b] font-sketch shrink-0 min-h-[32px] sm:min-h-[34px]"
          title="Entrar na chamada de voz ao vivo (P2P)"
        >
          <PhoneCall className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
          <span className="hidden md:inline font-kalam">Voz</span>
          <span className="text-[9px] bg-yellow-200 border border-zinc-900 text-zinc-900 px-1.5 sm:px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
            Mic
          </span>
          {activeVoicePlayers.length > 0 && (
            <span className="text-[10px] bg-emerald-100 border border-zinc-900 text-emerald-950 font-bold px-1.5 py-0.5 rounded-full">
              {activeVoicePlayers.length}
            </span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-emerald-100 border-2 border-zinc-900 p-0.5 sm:p-1 rounded-full text-xs font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b] shrink-0 font-sketch">
          {/* Live Speaking Indicator / Expand Drawer */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 pl-1.5 sm:pl-2 pr-1 sm:pr-1.5 py-0.5 hover:bg-emerald-200/60 rounded-full transition-colors select-none"
            title="Abrir painel de volume e participantes"
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isSpeaking && !isMuted ? 'bg-emerald-600 scale-125' : 'bg-emerald-700'
                }`}
              />
              {isSpeaking && !isMuted && (
                <span className="absolute w-4 h-4 rounded-full bg-emerald-400/50 animate-ping" />
              )}
            </div>
            <span className="text-xs font-kalam text-emerald-950 font-bold hidden md:inline">
              Voz ({activeVoicePlayers.length})
            </span>
            <Sliders className="w-3 h-3 text-emerald-900 hover:text-zinc-900" />
          </button>

          {/* Mute Microphone Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-rose-200 text-rose-950 border-zinc-900 shadow-[1px_1px_0px_#18181b]'
                : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-900 shadow-[1px_1px_0px_#18181b]'
            }`}
            title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-800" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          {/* Deafen Button */}
          <button
            type="button"
            onClick={handleToggleDeafen}
            className={`p-1.5 rounded-full border transition-all ${
              isDeafened
                ? 'bg-rose-200 text-rose-950 border-zinc-900 shadow-[1px_1px_0px_#18181b]'
                : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-900 shadow-[1px_1px_0px_#18181b]'
            }`}
            title={isDeafened ? 'Desensurdecer' : 'Ensurdecer'}
          >
            {isDeafened ? <VolumeX className="w-3.5 h-3.5 text-rose-800" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Leave Voice Button */}
          <button
            type="button"
            onClick={handleLeaveVoice}
            className="p-1.5 rounded-full bg-rose-200 hover:bg-rose-300 text-rose-950 border border-zinc-900 shadow-[1px_1px_0px_#18181b] transition-colors"
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
            className="fixed sm:absolute top-14 sm:top-12 right-2 sm:right-0 z-50 bg-rose-100 border-2 border-zinc-900 text-rose-950 text-xs p-3 rounded-2xl shadow-[4px_4px_0px_#18181b] flex items-start gap-2 max-w-xs font-sketch"
          >
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="block mt-1 text-xs underline text-rose-800 hover:text-rose-950 font-bold"
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
            className="fixed sm:absolute top-14 sm:top-12 right-2 sm:right-0 z-50 bg-white border-2 border-zinc-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_#18181b] w-[calc(100vw-1rem)] sm:w-80 max-w-sm text-xs space-y-3 font-sketch"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-900 text-zinc-800 text-xs font-bold uppercase tracking-wider font-kalam">
              <div className="flex items-center gap-2 text-zinc-900">
                <Users className="w-4 h-4 text-zinc-900" />
                <span>Painel de Voz P2P ✏️</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-zinc-600 hover:text-zinc-900 p-1 rounded-lg border border-zinc-900 hover:bg-zinc-100 shadow-[1px_1px_0px_#18181b]"
              >
                ✕
              </button>
            </div>

            {/* Master Volume Slider */}
            <div className="bg-zinc-50 border-2 border-zinc-900 p-3 rounded-2xl space-y-1.5 shadow-[2px_2px_0px_#18181b]">
              <div className="flex items-center justify-between text-xs font-bold font-kalam">
                <span className="flex items-center gap-1.5 text-zinc-900">
                  <Headphones className="w-3.5 h-3.5 text-zinc-900" />
                  Volume Geral
                </span>
                <span className="font-mono text-zinc-900">{masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => handleSetMasterVolume(Number(e.target.value))}
                className="w-full accent-yellow-400 h-2 bg-zinc-200 rounded-lg cursor-pointer border border-zinc-900"
              />
            </div>

            {/* Local Microphone Live Meter & Test */}
            <div className="bg-zinc-50 border-2 border-zinc-900 p-3 rounded-2xl space-y-2 shadow-[2px_2px_0px_#18181b]">
              <div className="flex items-center justify-between text-xs font-bold font-kalam">
                <span className="flex items-center gap-1.5 text-zinc-900">
                  <Mic className="w-3.5 h-3.5 text-zinc-900" />
                  Seu Microfone
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border border-zinc-900 ${
                  isMuted ? 'bg-rose-200 text-rose-950' : isSpeaking ? 'bg-emerald-200 text-emerald-950 animate-pulse' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {isMuted ? 'Mutado' : isSpeaking ? 'Falando 🎙️' : 'Pronto'}
                </span>
              </div>

              {/* Dynamic VU meter bar */}
              <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden border border-zinc-900">
                <div 
                  className={`h-full transition-all duration-75 ${
                    isMuted ? 'bg-zinc-400' : micVolumeLevel > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${isMuted ? 0 : micVolumeLevel}%` }}
                />
              </div>

              {/* Loopback Mic Test Button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleLoopbackTest}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border-2 border-zinc-900 transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_#18181b] active:scale-95 ${
                    isLoopbackTesting 
                      ? 'bg-yellow-200 text-zinc-950 shadow-sm animate-pulse' 
                      : 'bg-white hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-zinc-900" />
                  <span>{isLoopbackTesting ? 'Ouvindo Retorno (Clique p/ Parar)' : 'Testar Microfone (Ouvir Retorno)'}</span>
                </button>
              </div>
            </div>

            {/* Participants list with individual volume sliders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-700 font-kalam">
                <span>Participantes ({activeVoicePlayers.length})</span>
                <span>Volume</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeVoicePlayers.map((p) => {
                  const isMe = p.id === socket.id || (Boolean(myPlayer?.name) && p.name === myPlayer?.name);
                  const isPeerSpeaking = isMe ? (isSpeaking && !isMuted) : speakingPeers.has(p.id);
                  const pVol = peerVolumes[p.id] ?? 100;

                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-2xl bg-white border-2 border-zinc-900 transition-all shadow-[2px_2px_0px_#18181b] ${
                        isPeerSpeaking ? 'bg-yellow-50 ring-2 ring-emerald-400' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 font-kalam">
                        <div className="flex items-center gap-2">
                          <AvatarIcon avatar={p.avatar} className="w-6 h-6 sm:w-7 sm:h-7" />
                          <span className="font-bold text-zinc-900 text-xs truncate max-w-[120px]">
                            {p.name} {isMe && <span className="text-blue-700 text-[10px] font-sketch">(Você)</span>}
                          </span>
                        </div>

                        {/* Speaking badge */}
                        <div className="flex items-center gap-1 font-sketch">
                          {isMe ? (
                            isMuted ? (
                              <span className="text-[10px] text-rose-950 bg-rose-200 border border-zinc-900 px-2 py-0.5 rounded-md font-bold">
                                Mutado
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-950 bg-emerald-200 border border-zinc-900 px-2 py-0.5 rounded-md font-bold">
                                Ativo
                              </span>
                            )
                          ) : (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border border-zinc-900 ${
                              isPeerSpeaking ? 'bg-emerald-200 text-emerald-950 animate-pulse' : 'bg-zinc-100 text-zinc-700'
                            }`}>
                              {isPeerSpeaking ? 'Falando 🔊' : 'Ouvindo'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Volume Slider for Remote Peer */}
                      {!isMe && (
                        <div className="flex items-center gap-2 pt-1 border-t border-dashed border-zinc-300">
                          <Volume2 className="w-3 h-3 text-zinc-600 shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={pVol}
                            onChange={(e) => handleSetPeerVolume(p.id, Number(e.target.value))}
                            className="w-full accent-yellow-400 h-1.5 bg-zinc-200 rounded cursor-pointer border border-zinc-900"
                            title={`Ajustar volume de ${p.name}`}
                          />
                          <span className="text-[10px] font-mono text-zinc-700 shrink-0 w-7 text-right">
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
