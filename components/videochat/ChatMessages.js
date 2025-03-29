import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts';
import { setMessages, addMessage, clearChat } from '@/store/slices/chatSlice';
import { FaPaperPlane } from 'react-icons/fa';

const ChatMessages = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { room } = useSelector((state) => state.videoChat);
  const { messages, loading } = useSelector((state) => state.chat);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to messages
  useEffect(() => {
    if (!room?.id) return;

    // Clear previous messages
    dispatch(clearChat());

    // Subscribe to new messages
    const messagesRef = collection(db, `rooms/${room.id}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    unsubscribeRef.current = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      dispatch(setMessages(newMessages));
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [room?.id, dispatch]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !room) return;

    try {
      const messagesRef = collection(db, `rooms/${room.id}/messages`);
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        userId: user.uid,
        userName: user.displayName,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!room) return null;

  return (
    <div className="flex flex-col h-full bg-white border-t">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.userId === user?.uid ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.userId === user?.uid
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {message.userId === user?.uid ? 'You' : message.userName}
              </div>
              <div className="text-sm">{message.text}</div>
              <div className="text-xs mt-1 opacity-70">
                {message.createdAt?.toDate().toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

 