// WebRTC configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: [
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all'
};

class WebRTCManager {
  constructor(roomId, userId, firestore) {
    this.roomId = roomId;
    this.userId = userId;
    this.firestore = firestore;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.onTrackCallbacks = new Set();
    this.onParticipantLeftCallbacks = new Set();
    this.onConnectionStateChangeCallbacks = new Set();
    this.onConnectionQualityChangeCallbacks = new Set();
    
    // Connection state tracking
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectionTimeout = null;
    this.connectionQuality = 'unknown';
    
    // ICE connection quality monitoring
    this.iceConnectionQuality = {
      rtt: 0,
      bandwidth: 0,
      packetLoss: 0
    };
    
    console.log('[WebRTC] Manager initialized:', { 
      roomId, 
      userId,
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor
      }
    });
  }

  // Monitor connection quality
  monitorConnectionQuality(peerConnection) {
    if (!peerConnection) return;

    // Monitor RTT
    peerConnection.getStats().then(stats => {
      stats.forEach(report => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          this.iceConnectionQuality.rtt = report.currentRoundTripTime;
          this.iceConnectionQuality.bandwidth = report.availableOutgoingBitrate;
          this.iceConnectionQuality.packetLoss = report.packetsLost / report.packetsSent;
          
          // Update connection quality based on metrics
          let quality = 'good';
          if (this.iceConnectionQuality.packetLoss > 0.1) {
            quality = 'poor';
          } else if (this.iceConnectionQuality.rtt > 300) {
            quality = 'fair';
          }
          
          if (this.connectionQuality !== quality) {
            this.connectionQuality = quality;
            this.onConnectionQualityChangeCallbacks.forEach(callback => 
              callback(quality, this.iceConnectionQuality)
            );
          }
        }
      });
    });
  }

  // Handle connection failure with exponential backoff
  async handleConnectionFailure(remoteUserId) {
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.error('[WebRTC] Max connection attempts reached');
      this.onConnectionStateChangeCallbacks.forEach(callback => 
        callback(remoteUserId, 'failed')
      );
      return;
    }

    // Clear any existing timeout
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
    }

    // Calculate backoff time (exponential)
    const backoffTime = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    
    console.log(`[WebRTC] Attempting reconnection in ${backoffTime}ms (attempt ${this.connectionAttempts + 1})`);
    
    this.reconnectionTimeout = setTimeout(async () => {
      this.connectionAttempts++;
      try {
        await this.initiateConnection(remoteUserId);
      } catch (error) {
        console.error('[WebRTC] Reconnection attempt failed:', error);
        this.handleConnectionFailure(remoteUserId);
      }
    }, backoffTime);
  }

  // Create peer connection with enhanced error handling
  async createPeerConnection(remoteUserId) {
    console.log('[WebRTC] Creating peer connection for:', remoteUserId);
    
    if (this.peerConnections.has(remoteUserId)) {
      console.log('[WebRTC] Peer connection already exists');
      return this.peerConnections.get(remoteUserId);
    }

    const peerConnection = new RTCPeerConnection(configuration);
    this.peerConnections.set(remoteUserId, peerConnection);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track');
      this.onTrackCallbacks.forEach(callback => callback(event.streams[0]));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] New ICE candidate');
        this.sendSignalingMessage(remoteUserId, {
          type: 'candidate',
          candidate: event.candidate
        });
      }
    };

    // Monitor connection state
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log('[WebRTC] ICE connection state change:', {
        state,
        remoteUserId,
        connectionAttempts: this.connectionAttempts
      });
      
      this.onConnectionStateChangeCallbacks.forEach(callback => 
        callback(remoteUserId, state)
      );
      
      if (state === 'failed' || state === 'disconnected') {
        console.log('[WebRTC] ICE connection failed or disconnected, attempting recovery');
        this.handleConnectionFailure(remoteUserId);
      } else if (state === 'connected') {
        console.log('[WebRTC] ICE connection established successfully');
        this.connectionAttempts = 0;
        this.isConnecting = false;
        this.startConnectionQualityMonitoring(peerConnection);
      }
    };

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('[WebRTC] Connection state change:', {
        state,
        remoteUserId,
        iceConnectionState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState
      });
    };

    // Monitor signaling state
    peerConnection.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state change:', {
        state: peerConnection.signalingState,
        remoteUserId
      });
    };

    return peerConnection;
  }

  // Start monitoring connection quality
  startConnectionQualityMonitoring(peerConnection) {
    // Monitor quality every 5 seconds
    setInterval(() => {
      this.monitorConnectionQuality(peerConnection);
    }, 5000);
  }

  // Check media permissions before initializing
  async checkMediaPermissions(videoEnabled = true, audioEnabled = true) {
    console.log('Checking media permissions:', { videoEnabled, audioEnabled });
    try {
      // First check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support video/audio capabilities');
      }

      // Check permissions status if the API is available
      if (navigator.permissions && navigator.permissions.query) {
        const devices = [];
        if (videoEnabled) devices.push({ name: 'camera' });
        if (audioEnabled) devices.push({ name: 'microphone' });

        const results = await Promise.all(
          devices.map(device => navigator.permissions.query({ name: device.name }))
        );

        const denied = results.find(result => result.state === 'denied');
        if (denied) {
          throw new Error('Camera or microphone access is blocked. Please check your browser settings.');
        }
      }

      // Try to get devices list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');

      if (videoEnabled && !hasVideo) {
        throw new Error('No camera detected');
      }
      if (audioEnabled && !hasAudio) {
        throw new Error('No microphone detected');
      }

      return true;
    } catch (error) {
      console.error('Error checking media permissions:', error);
      throw error;
    }
  }

  // Initialize media stream with more specific constraints and better error handling
  async initializeMedia(videoEnabled = true, audioEnabled = true) {
    console.log('Initializing media:', { videoEnabled, audioEnabled });
    try {
      // Check permissions first
      await this.checkMediaPermissions(videoEnabled, audioEnabled);

      const constraints = {
        video: videoEnabled ? {
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 1.7777777778 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        } : false,
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: { ideal: 2 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 }
        } : false
      };

      // First try to get the media with ideal constraints
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.warn('Failed to get media with ideal constraints, trying fallback:', error);
        
        if (error.name === 'NotAllowedError') {
          throw new Error('Please allow access to your camera and microphone to use video chat');
        }
        
        if (error.name === 'NotFoundError') {
          throw new Error('No camera or microphone found. Please check your device connections');
        }
        
        // Fallback to basic constraints
        const fallbackConstraints = {
          video: videoEnabled ? { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } : false,
          audio: audioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true
          } : false
        };
        
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (fallbackError) {
          console.error('Fallback media access failed:', fallbackError);
          throw new Error('Could not access your camera or microphone. Please check your device settings');
        }
      }

      // Verify that we got the tracks we requested
      if (videoEnabled && !this.localStream.getVideoTracks().length) {
        throw new Error('Failed to get video track');
      }
      if (audioEnabled && !this.localStream.getAudioTracks().length) {
        throw new Error('Failed to get audio track');
      }

      console.log('Media initialized successfully:', {
        video: this.localStream.getVideoTracks().length > 0,
        audio: this.localStream.getAudioTracks().length > 0
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Error initializing media:', error);
      throw error;
    }
  }

  // Add callback for connection state changes
  onConnectionStateChange(callback) {
    this.onConnectionStateChangeCallbacks.add(callback);
  }

  // Send signaling message through Firestore
  async sendSignalingMessage(remoteUserId, message) {
    console.log('Sending signaling message:', { to: remoteUserId, type: message.type });
    try {
      const signalingRef = this.firestore
        .collection('rooms')
        .doc(this.roomId)
        .collection('signaling')
        .doc(`${this.userId}_${remoteUserId}`);

      await signalingRef.set({
        from: this.userId,
        to: remoteUserId,
        message,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error sending signaling message:', error);
      throw error;
    }
  }

  // Start listening for signaling messages
  listenForSignalingMessages() {
    console.log('Starting to listen for signaling messages');
    const roomRef = this.firestore.collection('rooms').doc(this.roomId);
    
    // Listen for new participants
    roomRef.collection('participants').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        const participantId = change.doc.id;
        console.log('Participant change:', { type: change.type, participantId });
        
        if (change.type === 'added' && participantId !== this.userId) {
          console.log('New participant joined, initiating connection');
          await this.initiateConnection(participantId);
        } else if (change.type === 'removed') {
          console.log('Participant left');
          this.handlePeerDisconnection(participantId);
        }
      });
    });

    // Listen for signaling messages
    roomRef.collection('signaling')
      .where('to', '==', this.userId)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            console.log('Received signaling message:', { from: data.from, type: data.message.type });
            await this.handleSignalingMessage(data.from, data.message);
            // Clean up signaling message
            await change.doc.ref.delete();
          }
        });
      });
  }

  // Handle incoming signaling messages
  async handleSignalingMessage(fromUserId, message) {
    console.log('[WebRTC] Handling signaling message:', { 
      from: fromUserId, 
      type: message.type,
      timestamp: new Date().toISOString()
    });
    
    try {
      let peerConnection = this.peerConnections.get(fromUserId);

      if (!peerConnection) {
        console.log('[WebRTC] Creating new peer connection for incoming message');
        peerConnection = await this.createPeerConnection(fromUserId);
      }

      switch (message.type) {
        case 'offer':
          console.log('[WebRTC] Processing offer:', {
            hasRemoteDescription: !!message.offer,
            signalingState: peerConnection.signalingState
          });
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
          console.log('[WebRTC] Creating answer');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await this.sendSignalingMessage(fromUserId, {
            type: 'answer',
            answer,
          });
          break;

        case 'answer':
          console.log('[WebRTC] Processing answer:', {
            hasRemoteDescription: !!message.answer,
            signalingState: peerConnection.signalingState
          });
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
          break;

        case 'ice-candidate':
          if (message.candidate) {
            console.log('[WebRTC] Processing ICE candidate:', {
              type: message.candidate.type,
              protocol: message.candidate.protocol,
              address: message.candidate.address,
              port: message.candidate.port
            });
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
          break;
      }
    } catch (error) {
      console.error('[WebRTC] Error handling signaling message:', error);
      throw error;
    }
  }

  // Initiate connection with a new peer
  async initiateConnection(remoteUserId) {
    if (this.isConnecting) {
      console.log('Connection already in progress, skipping');
      return;
    }

    console.log('Initiating connection with:', remoteUserId);
    this.isConnecting = true;

    try {
      const peerConnection = await this.createPeerConnection(remoteUserId);
      console.log('Creating offer');
      const offer = await peerConnection.createOffer();
      console.log('Setting local description');
      await peerConnection.setLocalDescription(offer);
      console.log('Sending offer');
      await this.sendSignalingMessage(remoteUserId, {
        type: 'offer',
        offer,
      });
    } catch (error) {
      console.error('Error initiating connection:', error);
      this.handleConnectionFailure(remoteUserId);
    } finally {
      this.isConnecting = false;
    }
  }

  // Handle peer disconnection
  handlePeerDisconnection(remoteUserId) {
    console.log('Handling peer disconnection:', remoteUserId);
    const peerConnection = this.peerConnections.get(remoteUserId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(remoteUserId);
      this.onParticipantLeftCallbacks.forEach(callback => callback(remoteUserId));
    }
  }

  // Register callbacks
  onTrack(callback) {
    this.onTrackCallbacks.add(callback);
  }

  onParticipantLeft(callback) {
    this.onParticipantLeftCallbacks.add(callback);
  }

  // Clean up resources
  async disconnect() {
    console.log('Disconnecting WebRTC');
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
    }
    
    this.peerConnections.forEach(connection => {
      connection.close();
    });
    
    this.peerConnections.clear();
    this.onTrackCallbacks.clear();
    this.onParticipantLeftCallbacks.clear();
  }

  // Toggle local video
  async toggleVideo(enabled) {
    console.log('Toggling video:', enabled);
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  // Toggle local audio
  async toggleAudio(enabled) {
    console.log('Toggling audio:', enabled);
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }
}

export default WebRTCManager;

export const createPeerConnection = () => {
  return new RTCPeerConnection(configuration);
};

export const createOffer = async (peerConnection) => {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

export const createAnswer = async (peerConnection) => {
  try {
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
};

export const handleIceCandidate = (peerConnection, candidate) => {
  return new Promise((resolve, reject) => {
    if (!candidate) {
      resolve();
      return;
    }

    peerConnection
      .addIceCandidate(new RTCIceCandidate(candidate))
      .then(resolve)
      .catch(reject);
  });
};

export const handleRemoteStream = (peerConnection, remoteVideoRef) => {
  peerConnection.ontrack = (event) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
  };
};

export const handleConnectionStateChange = (peerConnection, setIsConnected) => {
  peerConnection.onconnectionstatechange = () => {
    setIsConnected(peerConnection.connectionState === 'connected');
  };
}; 