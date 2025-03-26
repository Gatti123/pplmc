import { useAuth } from '@/contexts';
import Head from 'next/head';
import Link from 'next/link';
import { FaVideo, FaUserFriends, FaComments } from 'react-icons/fa';

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>Polemica - Engage in Meaningful Video Discussions</title>
        <meta name="description" content="Polemica connects you with others for meaningful debates and discussions on various topics in a video chat format." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-gradient-to-b from-indigo-50 to-white">
        {/* Hero Section */}
        <div className="pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
              Connect through meaningful discussions
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Debate ideas, share perspectives, and broaden your horizons in a video chat format.
            </p>
            
            <div className="mt-8">
              <Link 
                href="/videochat" 
                className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <FaVideo className="mr-2" />
                Start a Discussion
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose a Topic</h3>
              <p className="text-gray-600">
                Select from a variety of discussion topics that interest you, from politics to art to science.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Matched</h3>
              <p className="text-gray-600">
                Our platform will match you with someone who wants to discuss the same topic. You can filter by language and region.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Discussing</h3>
              <p className="text-gray-600">
                Engage in a video chat discussion with your match. Others can join as observers to watch the debate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to join the conversation?
          </h2>
          <p className="text-indigo-100 mb-8 max-w-3xl mx-auto">
            Join thousands of users having meaningful discussions on topics that matter.
          </p>
          {!user ? (
            <Link 
              href="/auth" 
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
            >
              <FaUserFriends className="mr-2" />
              Sign In to Get Started
            </Link>
          ) : (
            <Link 
              href="/videochat" 
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
            >
              <FaComments className="mr-2" />
              Find a Discussion Partner
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
