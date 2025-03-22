// WebRTC configuration
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
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
  }

  // Initialize media stream
  async initializeMedia(videoEnabled = true, audioEnabled = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: audioEnabled,
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Create a new peer connection for a user
  async createPeerConnection(remoteUserId) {
    const peerConnection = new RTCPeerConnection(configuration);
    this.peerConnections.set(remoteUserId, peerConnection);

    // Add local tracks to the peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(remoteUserId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      this.onTrackCallbacks.forEach(callback => callback(remoteUserId, event.streams[0]));
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'disconnected') {
        this.handlePeerDisconnection(remoteUserId);
      }
    };

    return peerConnection;
  }

  // Send signaling message through Firestore
  async sendSignalingMessage(remoteUserId, message) {
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
  }

  // Start listening for signaling messages
  listenForSignalingMessages() {
    const roomRef = this.firestore.collection('rooms').doc(this.roomId);
    
    // Listen for new participants
    roomRef.collection('participants').onSnapshot(snapshot => {
      snapshot.docChanges().forEach(async change => {
        const participantId = change.doc.id;
        
        if (change.type === 'added' && participantId !== this.userId) {
          // New participant joined, initiate connection
          await this.initiateConnection(participantId);
        } else if (change.type === 'removed') {
          // Participant left
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
            await this.handleSignalingMessage(data.from, data.message);
            // Clean up signaling message
            change.doc.ref.delete();
          }
        });
      });
  }

  // Handle incoming signaling messages
  async handleSignalingMessage(fromUserId, message) {
    let peerConnection = this.peerConnections.get(fromUserId);

    if (!peerConnection) {
      peerConnection = await this.createPeerConnection(fromUserId);
    }

    switch (message.type) {
      case 'offer':
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await this.sendSignalingMessage(fromUserId, {
          type: 'answer',
          answer,
        });
        break;

      case 'answer':
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        break;

      case 'ice-candidate':
        if (message.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
        break;
    }
  }

  // Initiate connection with a new peer
  async initiateConnection(remoteUserId) {
    const peerConnection = await this.createPeerConnection(remoteUserId);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await this.sendSignalingMessage(remoteUserId, {
      type: 'offer',
      offer,
    });
  }

  // Handle peer disconnection
  handlePeerDisconnection(remoteUserId) {
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
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
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
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = enabled;
      }
    }
  }

  // Toggle local audio
  async toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = enabled;
      }
    }
  }
}

export default WebRTCManager; 