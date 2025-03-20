import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

const TextChat = ({ messages, onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-primary">Chat</h2>
      </div>

      <div className="flex-grow p-4 overflow-y-auto max-h-[400px]">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.sender.uid === 'me'
                    ? 'ml-auto bg-primary text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="font-semibold text-sm mb-1">
                  {msg.sender.displayName}
                </div>
                <div>{msg.text}</div>
                <div className="text-xs opacity-70 mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={disabled ? "Observer mode - can't send messages" : "Type your message..."}
            className="input-field flex-grow"
            disabled={disabled}
          />
          <button
            type="submit"
            className={`ml-2 p-2 rounded-full ${
              disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'
            } text-white`}
            disabled={disabled || !message.trim()}
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  );
};

export default TextChat; 