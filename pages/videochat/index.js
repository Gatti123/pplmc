import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';
import ProtectedRoute from '@/components/ProtectedRoute';
import TopicSelector from '@/components/TopicSelector';
import VideoChat from '@/components/VideoChat';
import LoadingSpinner from '@/components/LoadingSpinner';
import Head from 'next/head';

export default function VideoChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Имитация загрузки
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Video Chat | Polemica</title>
        <meta name="description" content="Engage in thought-provoking video discussions on Polemica" />
      </Head>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Start a Discussion
              </h1>
              
              {!selectedTopic ? (
                <TopicSelector onSelect={handleTopicSelect} />
              ) : (
                <VideoChat topic={selectedTopic} />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 