import { useState, useEffect } from 'react';
import { FaClock } from 'react-icons/fa';

const DiscussionTimer = ({ duration = 10, onTimerEnd }) => {
  // Convert duration from minutes to seconds
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onTimerEnd) {
        onTimerEnd();
      }
      return;
    }

    if (isPaused) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isPaused, onTimerEnd]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Calculate progress percentage
  const progress = (timeLeft / (duration * 60)) * 100;

  return (
    <div className="flex items-center space-x-2">
      <FaClock className="text-primary" />
      
      <div className="relative w-32 h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full ${
            progress < 30 ? 'bg-red-500' : progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
        
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
          {formatTime(timeLeft)}
        </div>
      </div>
      
      <button
        onClick={togglePause}
        className="text-xs text-primary hover:text-primary-dark"
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
    </div>
  );
};

export default DiscussionTimer; 