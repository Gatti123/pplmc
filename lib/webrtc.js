// WebRTC configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add TURN server for better connectivity
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
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
    
    // Add connection state tracking
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    console.log('WebRTCManager initialized:', { roomId, userId });
  }

  // Initialize media stream
  async initializeMedia(videoEnabled = true, audioEnabled = true) {
    console.log('Initializing media:', { videoEnabled, audioEnabled });
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
        audio: audioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
        } : false,
      });
      console.log('Media initialized successfully');
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw new Error(`Failed to access media devices: ${error.message}`);
    }
  }

  // Create a new peer connection for a user
  async createPeerConnection(remoteUserId) {
    console.log('Creating peer connection for:', remoteUserId);
    try {
      const peerConnection = new RTCPeerConnection(configuration);
      this.peerConnections.set(remoteUserId, peerConnection);

      // Add local tracks to the peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          console.log('Adding local track to peer connection:', track.kind);
          peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate);
          this.sendSignalingMessage(remoteUserId, {
            type: 'ice-candidate',
            candidate: event.candidate,
          });
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed') {
          this.handleConnectionFailure(remoteUserId);
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed') {
          this.handleConnectionFailure(remoteUserId);
        }
      };

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        this.onTrackCallbacks.forEach(callback => callback(remoteUserId, event.streams[0]));
      };

      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }

  // Handle connection failure
  async handleConnectionFailure(remoteUserId) {
    console.log('Handling connection failure for:', remoteUserId);
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      console.log(`Retrying connection (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      
      // Close existing connection
      const existingConnection = this.peerConnections.get(remoteUserId);
      if (existingConnection) {
        existingConnection.close();
        this.peerConnections.delete(remoteUserId);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * this.connectionAttempts));
      
      // Try to establish new connection
      await this.initiateConnection(remoteUserId);
    } else {
      console.log('Max connection attempts reached, giving up');
      this.handlePeerDisconnection(remoteUserId);
    }
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
    console.log('Handling signaling message:', { from: fromUserId, type: message.type });
    try {
      let peerConnection = this.peerConnections.get(fromUserId);

      if (!peerConnection) {
        console.log('Creating new peer connection for incoming message');
        peerConnection = await this.createPeerConnection(fromUserId);
      }

      switch (message.type) {
        case 'offer':
          console.log('Received offer, setting remote description');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
          console.log('Creating answer');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await this.sendSignalingMessage(fromUserId, {
            type: 'answer',
            answer,
          });
          break;

        case 'answer':
          console.log('Received answer, setting remote description');
          await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
          break;

        case 'ice-candidate':
          if (message.candidate) {
            console.log('Received ICE candidate');
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
          break;
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
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