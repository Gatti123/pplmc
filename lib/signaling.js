import { ref, onValue, set, remove, serverTimestamp } from 'firebase/database';
import { db } from './firebase';

class SignalingServer {
  constructor(roomId, userId) {
    this.roomId = roomId;
    this.userId = userId;
    this.roomRef = ref(db, `rooms/${roomId}`);
    this.peerRef = ref(db, `rooms/${roomId}/peers/${userId}`);
    this.offersRef = ref(db, `rooms/${roomId}/offers`);
    this.answersRef = ref(db, `rooms/${roomId}/answers`);
    this.iceCandidatesRef = ref(db, `rooms/${roomId}/iceCandidates`);
  }

  // Присоединиться к комнате
  async joinRoom() {
    try {
      await set(this.peerRef, {
        userId: this.userId,
        joinedAt: serverTimestamp(),
        status: 'online'
      });
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  // Покинуть комнату
  async leaveRoom() {
    try {
      await remove(this.peerRef);
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  // Отправить предложение
  async sendOffer(targetUserId, offer) {
    try {
      await set(ref(db, `rooms/${this.roomId}/offers/${this.userId}_${targetUserId}`), {
        from: this.userId,
        to: targetUserId,
        offer,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending offer:', error);
      throw error;
    }
  }

  // Отправить ответ
  async sendAnswer(targetUserId, answer) {
    try {
      await set(ref(db, `rooms/${this.roomId}/answers/${this.userId}_${targetUserId}`), {
        from: this.userId,
        to: targetUserId,
        answer,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending answer:', error);
      throw error;
    }
  }

  // Отправить ICE кандидата
  async sendIceCandidate(targetUserId, candidate) {
    try {
      await set(ref(db, `rooms/${this.roomId}/iceCandidates/${this.userId}_${targetUserId}`), {
        from: this.userId,
        to: targetUserId,
        candidate,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending ICE candidate:', error);
      throw error;
    }
  }

  // Слушать предложения
  listenForOffers(callback) {
    return onValue(this.offersRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.to === this.userId) {
          callback(data.from, data.offer);
          // Удалить обработанное предложение
          remove(childSnapshot.ref);
        }
      });
    });
  }

  // Слушать ответы
  listenForAnswers(callback) {
    return onValue(this.answersRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.to === this.userId) {
          callback(data.from, data.answer);
          // Удалить обработанный ответ
          remove(childSnapshot.ref);
        }
      });
    });
  }

  // Слушать ICE кандидатов
  listenForIceCandidates(callback) {
    return onValue(this.iceCandidatesRef, (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.to === this.userId) {
          callback(data.from, data.candidate);
          // Удалить обработанный ICE кандидат
          remove(childSnapshot.ref);
        }
      });
    });
  }

  // Слушать подключение новых пиров
  listenForPeers(callback) {
    return onValue(ref(db, `rooms/${this.roomId}/peers`), (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data.userId !== this.userId) {
          callback(data.userId);
        }
      });
    });
  }
}

export default SignalingServer; 