import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, PhoneCall, PhoneOff, 
  Users, AlertCircle, Headphones, Sliders, Sparkles,
  Shield, ShieldOff, Lock, Volume1
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
  isVoiceDisabled?: boolean;
  isHost?: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
  iceCandidatePoolSize: 10,
};

export default function VoiceChat({
  socket,
  roomId,
  players,
  myPlayer,
  voiceUserIds: serverVoiceUserIds = [],
  isVoiceDisabled = false,
  isHost = false,
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
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
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
  const iceCandidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  
  const isMutedRef = useRef(false);
  isMutedRef.current = isMuted;
  const isDeafenedRef = useRef(false);
  isDeafenedRef.current = isDeafened;
  const masterVolumeRef = useRef(100);
  masterVolumeRef.current = masterVolume;
  const peerVolumesRef = useRef<Record<string, number>>({});
  peerVolumesRef.current = peerVolumes;

  const isMutedByHost = Boolean(myPlayer?.isVoiceMutedByHost);

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

  // Process queued ICE candidates after remote description is set
  const drainIceCandidates = async (peerId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueuesRef.current.get(peerId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn(`Error adding queued ICE candidate for ${peerId}:`, e);
        }
      }
      iceCandidateQueuesRef.current.set(peerId, []);
    }
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
    iceCandidateQueuesRef.current.delete(peerId);
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
    setInfoMsg(null);

    if (isVoiceDisabled) {
      setErrorMsg('O chat de voz foi desativado pelo Host.');
      return;
    }

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
      setIsMuted(isMutedByHost);
      setIsDeafened(false);
      sounds.playPop();

      if (isMutedByHost) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

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
    if (isMutedByHost) {
      setErrorMsg('Você foi silenciado pelo Host e não pode reativar o microfone.');
      return;
    }

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
  const handleLeaveVoice = useCallback(() => {
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
    iceCandidateQueuesRef.current.clear();

    setVoicePeerIds([]);
    setSpeakingPeers(new Set());
    socket.emit('voice_leave', { roomId });
  }, [roomId, socket]);

  // Host Moderation Handlers
  const handleToggleRoomVoice = () => {
    sounds.playPop();
    socket.emit('toggle_room_voice', { roomId });
  };

  const handleHostToggleUserMute = (targetUserId: string) => {
    sounds.playPop();
    socket.emit('host_toggle_user_voice_mute', { roomId, targetUserId });
  };

  const handleHostMuteAll = (muteAll: boolean) => {
    sounds.playPop();
    socket.emit('host_mute_all_voice', { roomId, muteAll });
  };

  // React to isMutedByHost changes
  useEffect(() => {
    if (isMutedByHost) {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
      setIsMuted(true);
      setIsSpeaking(false);
      setMicVolumeLevel(0);
    }
  }, [isMutedByHost]);

  // Listen to Host moderation events
  useEffect(() => {
    const handleMutedByHost = ({ isMuted: muted }: { isMuted: boolean }) => {
      if (muted) {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setIsMuted(true);
        setIsSpeaking(false);
        setMicVolumeLevel(0);
        setErrorMsg('🔇 Você foi silenciado pelo Host da sala.');
      } else {
        setInfoMsg('🔊 O Host liberou seu microfone!');
        setTimeout(() => setInfoMsg(null), 3500);
      }
    };

    const handleVoiceRoomDisabled = () => {
      if (isInVoice) {
        handleLeaveVoice();
        setErrorMsg('🔇 O Host desativou o chat de voz da sala.');
      }
    };

    socket.on('user_voice_muted_by_host', handleMutedByHost);
    socket.on('voice_room_disabled', handleVoiceRoomDisabled);

    return () => {
      socket.off('user_voice_muted_by_host', handleMutedByHost);
      socket.off('voice_room_disabled', handleVoiceRoomDisabled);
    };
  }, [socket, isInVoice, handleLeaveVoice]);

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
        await drainIceCandidates(from, pc);

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
          await drainIceCandidates(from, pc);
        }
      } catch (err) {
        console.error(`Error setting remote description from ${from}:`, err);
      }
    };

    const handleVoiceIceCandidate = async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        const pc = peerConnectionsRef.current.get(from);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue candidate until setRemoteDescription completes
          const q = iceCandidateQueuesRef.current.get(from) || [];
          q.push(candidate);
          iceCandidateQueuesRef.current.set(from, q);
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
          await drainIceCandidates(sender, pc);
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc_signal', { target: sender, data: { sdp: answer } });
          }
        } else if (data.candidate) {
          const pc = peerConnectionsRef.current.get(sender);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } else {
            const q = iceCandidateQueuesRef.current.get(sender) || [];
            q.push(data.candidate);
            iceCandidateQueuesRef.current.set(sender, q);
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
  const otherVoicePlayers = activeVoicePlayers.filter((p) => p.id !== socket.id);
  const allOtherMutedByHost = otherVoicePlayers.length > 0 && otherVoicePlayers.every((p) => p.isVoiceMutedByHost);

  return (
    <div className="relative">
      {/* Primary Voice Pill */}
      {isVoiceDisabled ? (
        // Voice Disabled State
        isHost ? (
          <button
            type="button"
            onClick={handleToggleRoomVoice}
            className="flex items-center gap-1.5 bg-zinc-100 hover:bg-amber-100 border-2 border-zinc-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold text-zinc-700 transition-all active:scale-95 shadow-[2px_2px_0px_#18181b] font-sketch shrink-0"
            title="Chat de voz desativado. Clique para ativar na sala."
          >
            <ShieldOff className="w-3.5 h-3.5 text-zinc-600" />
            <span className="hidden sm:inline font-kalam">Voz Off</span>
            <span className="text-[9px] bg-amber-200 border border-zinc-900 text-zinc-900 px-1.5 py-0.2 rounded-full font-bold">
              Ativar
            </span>
          </button>
        ) : (
          <div 
            className="flex items-center gap-1.5 bg-zinc-100 border-2 border-zinc-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold text-zinc-500 font-sketch opacity-75 select-none"
            title="O Host desativou o chat de voz nesta sala."
          >
            <ShieldOff className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-kalam">Voz Desativada</span>
          </div>
        )
      ) : !isInVoice ? (
        // Not in Voice Call
        <button
          type="button"
          onClick={handleJoinVoice}
          className="flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-amber-50 border-2 border-zinc-900 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-bold text-zinc-900 transition-all active:scale-95 shadow-[2px_2px_0px_#18181b] font-sketch shrink-0 min-h-[32px] sm:min-h-[34px]"
          title="Entrar na chamada de voz P2P (Até 8 pessoas recomendadas)"
        >
          <PhoneCall className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="font-kalam">Voz</span>
          <span className="text-[9px] bg-yellow-200 border border-zinc-900 text-zinc-900 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">
            P2P
          </span>
          {activeVoicePlayers.length > 0 && (
            <span className="text-[10px] bg-emerald-200 border border-zinc-900 text-emerald-950 font-black px-1.5 py-0.5 rounded-full animate-pulse">
              {activeVoicePlayers.length}
            </span>
          )}
        </button>
      ) : (
        // Connected in Voice Call
        <div className="flex items-center gap-1 bg-emerald-100 border-2 border-zinc-900 p-0.5 sm:p-1 rounded-full text-xs font-bold text-zinc-900 shadow-[2px_2px_0px_#18181b] shrink-0 font-sketch">
          {/* Live Speaking Indicator / Expand Drawer */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 pl-1.5 sm:pl-2 pr-1 sm:pr-1.5 py-0.5 hover:bg-emerald-200/70 rounded-full transition-colors select-none"
            title="Abrir painel de voz, volumes e participantes"
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isSpeaking && !isMuted && !isMutedByHost ? 'bg-emerald-600 scale-125' : 'bg-emerald-700'
                }`}
              />
              {isSpeaking && !isMuted && !isMutedByHost && (
                <span className="absolute w-4 h-4 rounded-full bg-emerald-400/60 animate-ping" />
              )}
            </div>
            <span className="text-xs font-kalam text-emerald-950 font-bold">
              Voz ({activeVoicePlayers.length})
            </span>
            <Sliders className="w-3 h-3 text-emerald-900 hover:text-zinc-900" />
          </button>

          {/* Mute Microphone Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-1.5 rounded-full border transition-all ${
              isMutedByHost
                ? 'bg-rose-300 text-rose-950 border-zinc-900 shadow-[1px_1px_0px_#18181b] cursor-not-allowed'
                : isMuted
                ? 'bg-rose-200 text-rose-950 border-zinc-900 shadow-[1px_1px_0px_#18181b]'
                : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-900 shadow-[1px_1px_0px_#18181b]'
            }`}
            title={
              isMutedByHost
                ? 'Silenciado pelo Host da sala'
                : isMuted
                ? 'Desmutar seu microfone'
                : 'Mutar seu microfone'
            }
          >
            {isMutedByHost ? (
              <Lock className="w-3.5 h-3.5 text-rose-900" />
            ) : isMuted ? (
              <MicOff className="w-3.5 h-3.5 text-rose-800" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-zinc-900" />
            )}
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
            title={isDeafened ? 'Desensurdecer (ouvir novamente)' : 'Ensurdecer (não ouvir ninguém)'}
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
            <PhoneOff className="w-3.5 h-3.5 text-rose-900" />
          </button>
        </div>
      )}

      {/* Warning/Error notification toast */}
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
              <span className="font-bold">{errorMsg}</span>
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

      {/* Info notification toast */}
      <AnimatePresence>
        {infoMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed sm:absolute top-14 sm:top-12 right-2 sm:right-0 z-50 bg-emerald-100 border-2 border-zinc-900 text-emerald-950 text-xs p-3 rounded-2xl shadow-[4px_4px_0px_#18181b] flex items-start gap-2 max-w-xs font-sketch"
          >
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">{infoMsg}</span>
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
            className="fixed sm:absolute top-14 sm:top-12 right-2 sm:right-0 z-50 bg-white border-2 border-zinc-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[6px_6px_0px_#18181b] w-[calc(100vw-1rem)] sm:w-84 max-w-sm text-xs space-y-3 font-sketch"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-900 text-zinc-800 text-xs font-bold uppercase tracking-wider font-kalam">
              <div className="flex items-center gap-2 text-zinc-900">
                <Users className="w-4 h-4 text-zinc-900" />
                <span>Chat de Voz P2P 🎙️</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-zinc-600 hover:text-zinc-900 p-1 rounded-lg border border-zinc-900 hover:bg-zinc-100 shadow-[1px_1px_0px_#18181b]"
              >
                ✕
              </button>
            </div>

            {/* Host Moderation Panel (Exclusive for Host) */}
            {isHost && (
              <div className="bg-amber-100 border-2 border-zinc-900 p-2.5 rounded-2xl space-y-2 shadow-[2px_2px_0px_#18181b]">
                <div className="flex items-center justify-between font-kalam">
                  <span className="text-xs font-black text-zinc-900 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-800" />
                    Moderação do Host
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleRoomVoice}
                    className="text-[10px] bg-white hover:bg-amber-50 border border-zinc-900 px-2 py-0.5 rounded-lg font-bold shadow-xs transition-colors"
                  >
                    Desativar Voz da Sala
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleHostMuteAll(!allOtherMutedByHost)}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border border-zinc-900 shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      allOtherMutedByHost
                        ? 'bg-emerald-200 text-emerald-950 font-black'
                        : 'bg-rose-200 hover:bg-rose-300 text-rose-950'
                    }`}
                  >
                    <MicOff className="w-3 h-3" />
                    <span>{allOtherMutedByHost ? 'Desmutar Todos' : 'Silenciar Todos'}</span>
                  </button>
                </div>
              </div>
            )}

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
                  isMutedByHost
                    ? 'bg-rose-300 text-rose-950 font-black'
                    : isMuted
                    ? 'bg-rose-200 text-rose-950'
                    : isSpeaking
                    ? 'bg-emerald-200 text-emerald-950 animate-pulse font-black'
                    : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {isMutedByHost ? 'Mutado pelo Host 🔒' : isMuted ? 'Mutado' : isSpeaking ? 'Falando 🎙️' : 'Pronto'}
                </span>
              </div>

              {/* Dynamic VU meter bar */}
              <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden border border-zinc-900">
                <div 
                  className={`h-full transition-all duration-75 ${
                    isMuted || isMutedByHost ? 'bg-zinc-400' : micVolumeLevel > 60 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${isMuted || isMutedByHost ? 0 : micVolumeLevel}%` }}
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
                  <span>{isLoopbackTesting ? 'Ouvindo Retorno (Parar)' : 'Testar Retorno de Voz'}</span>
                </button>
              </div>
            </div>

            {/* Participants list with individual volume sliders and Host Mute controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-700 font-kalam">
                <span>Participantes no Voz ({activeVoicePlayers.length})</span>
                <span className="text-[10px] text-zinc-500 font-sketch">Máx. 8 recomendados</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {activeVoicePlayers.map((p) => {
                  const isMe = p.id === socket.id || (Boolean(myPlayer?.name) && p.name === myPlayer?.name);
                  const isPeerSpeaking = isMe ? (isSpeaking && !isMuted && !isMutedByHost) : speakingPeers.has(p.id);
                  const isPeerMutedByHost = Boolean(p.isVoiceMutedByHost);
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
                          <div className="relative">
                            <AvatarIcon avatar={p.avatar} className="w-6 h-6 sm:w-7 sm:h-7" />
                            {isPeerSpeaking && (
                              <span className="absolute -inset-1 rounded-full border-2 border-emerald-500 animate-ping opacity-75" />
                            )}
                          </div>
                          <span className="font-bold text-zinc-900 text-xs truncate max-w-[110px]">
                            {p.name} {isMe && <span className="text-blue-700 text-[10px] font-sketch">(Você)</span>}
                          </span>
                        </div>

                        {/* Status badge + Host Mute Button */}
                        <div className="flex items-center gap-1.5 font-sketch">
                          {isMe ? (
                            isMutedByHost ? (
                              <span className="text-[10px] text-rose-950 bg-rose-300 border border-zinc-900 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Silenciado
                              </span>
                            ) : isMuted ? (
                              <span className="text-[10px] text-rose-950 bg-rose-200 border border-zinc-900 px-2 py-0.5 rounded-md font-bold">
                                Mutado
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-950 bg-emerald-200 border border-zinc-900 px-2 py-0.5 rounded-md font-bold">
                                Ativo
                              </span>
                            )
                          ) : (
                            <>
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border border-zinc-900 ${
                                isPeerMutedByHost
                                  ? 'bg-rose-200 text-rose-950'
                                  : isPeerSpeaking
                                  ? 'bg-emerald-200 text-emerald-950 animate-pulse font-bold'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}>
                                {isPeerMutedByHost ? 'Mutado 🔒' : isPeerSpeaking ? 'Falando 🔊' : 'Ouvindo'}
                              </span>

                              {/* Host Quick Mute Toggle for this specific user */}
                              {isHost && (
                                <button
                                  type="button"
                                  onClick={() => handleHostToggleUserMute(p.id)}
                                  className={`p-1 rounded-lg border border-zinc-900 text-[10px] font-bold shadow-xs transition-colors ${
                                    isPeerMutedByHost
                                      ? 'bg-emerald-200 hover:bg-emerald-300 text-emerald-950'
                                      : 'bg-rose-100 hover:bg-rose-200 text-rose-900'
                                  }`}
                                  title={isPeerMutedByHost ? `Liberar voz de ${p.name}` : `Silenciar voz de ${p.name}`}
                                >
                                  {isPeerMutedByHost ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Volume Slider for Remote Peer */}
                      {!isMe && (
                        <div className="flex items-center gap-2 pt-1 border-t border-dashed border-zinc-300">
                          <Volume1 className="w-3 h-3 text-zinc-600 shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="150"
                            value={pVol}
                            onChange={(e) => handleSetPeerVolume(p.id, Number(e.target.value))}
                            className="w-full accent-yellow-400 h-1.5 bg-zinc-200 rounded cursor-pointer border border-zinc-900"
                            title={`Ajustar volume de ${p.name} (0% - 150%)`}
                          />
                          <span className="text-[10px] font-mono text-zinc-700 shrink-0 w-8 text-right">
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
