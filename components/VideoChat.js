import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts';
import { toast } from 'react-toastify';
import SignalingServer from '@/lib/signaling';
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  handleIceCandidate,
  handleRemoteStream,
  handleConnectionStateChange
} from '@/lib/webrtc';

const VideoChat = ({ topic }) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const signalingServer = useRef(null);

  useEffect(() => {
    initializeMedia();
    return () => {
      cleanup();
    };
  }, []);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      initializeSignaling();
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera and microphone');
    }
  };

  const initializeSignaling = async () => {
    try {
      // Создаем уникальный ID комнаты на основе темы
      const roomId = topic.toLowerCase().replace(/\s+/g, '-');
      
      // Инициализируем сигнальный сервер
      signalingServer.current = new SignalingServer(roomId, user.uid);
      
      // Присоединяемся к комнате
      await signalingServer.current.joinRoom();

      // Инициализируем WebRTC соединение
      initializePeerConnection();

      // Начинаем слушать сигнальные сообщения
      setupSignalingListeners();
    } catch (error) {
      console.error('Error initializing signaling:', error);
      toast.error('Failed to initialize connection');
    }
  };

  const initializePeerConnection = () => {
    try {
      peerConnection.current = createPeerConnection();
      
      // Добавляем локальный поток
      localStream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, localStream);
      });

      // Обрабатываем удаленный поток
      handleRemoteStream(peerConnection.current, remoteVideoRef);
      
      // Отслеживаем состояние соединения
      handleConnectionStateChange(peerConnection.current, setIsConnected);

      // Обрабатываем ICE кандидатов
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          signalingServer.current.sendIceCandidate(user.uid, event.candidate);
        }
      };
    } catch (error) {
      console.error('Error initializing peer connection:', error);
      toast.error('Failed to initialize connection');
    }
  };

  const setupSignalingListeners = () => {
    // Слушаем новых участников
    signalingServer.current.listenForPeers(async (peerId) => {
      setIsInitiator(true);
      await startConnection(peerId);
    });

    // Слушаем предложения
    signalingServer.current.listenForOffers(async (fromUserId, offer) => {
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await createAnswer(peerConnection.current);
        await signalingServer.current.sendAnswer(fromUserId, answer);
      } catch (error) {
        console.error('Error handling offer:', error);
        toast.error('Failed to handle connection offer');
      }
    });

    // Слушаем ответы
    signalingServer.current.listenForAnswers(async (fromUserId, answer) => {
      try {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error handling answer:', error);
        toast.error('Failed to handle connection answer');
      }
    });

    // Слушаем ICE кандидатов
    signalingServer.current.listenForIceCandidates(async (fromUserId, candidate) => {
      try {
        await handleIceCandidate(peerConnection.current, candidate);
      } catch (error) {
        console.error('Error handling ICE candidate:', error);
      }
    });
  };

  const startConnection = async (targetUserId) => {
    try {
      const offer = await createOffer(peerConnection.current);
      await signalingServer.current.sendOffer(targetUserId, offer);
    } catch (error) {
      console.error('Error starting connection:', error);
      toast.error('Failed to start connection');
    }
  };

  const cleanup = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (signalingServer.current) {
      await signalingServer.current.leaveRoom();
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!isVideoOff);
    }
  };

  const leaveCall = async () => {
    await cleanup();
    setIsConnected(false);
    setRemoteStream(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Discussion Topic: {topic}
        </h2>
        <div className="flex space-x-4">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full ${
              isMuted ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full ${
              isVideoOff ? 'bg-red-500' : 'bg-green-500'
            } text-white`}
          >
            {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
          </button>
          <button
            onClick={leaveCall}
            className="p-2 rounded-full bg-red-500 text-white"
          >
            Leave Call
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg bg-gray-900"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
            You
          </div>
        </div>
        <div className="relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-gray-900"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
            {isConnected ? 'Connected' : 'Waiting for connection...'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChat; 