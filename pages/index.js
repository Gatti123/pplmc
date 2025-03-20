import { useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from '../context/UserContext';
import Link from 'next/link';
import { FaVideo, FaArrowRight } from 'react-icons/fa';

const Home = () => {
  const { user } = useContext(UserContext);
  const router = useRouter();

  const handleStartDiscussion = () => {
    if (user) {
      router.push('/videochat');
    } else {
      router.push('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-light to-primary-dark py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Welcome to Polemica
          </h1>
          <p className="text-xl text-secondary mb-10 max-w-3xl mx-auto">
            Connect with others through meaningful discussions in a video chat format.
            Debate ideas, share perspectives, and broaden your horizons.
          </p>
          <button
            onClick={handleStartDiscussion}
            className="bg-secondary text-primary font-bold py-3 px-8 rounded-full text-lg hover:bg-secondary-dark transition-colors inline-flex items-center"
          >
            <FaVideo className="mr-2" />
            Start a Discussion
            <FaArrowRight className="ml-2" />
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose a Topic</h3>
              <p className="text-gray-600">
                Select from a variety of discussion topics that interest you, from politics to art to science.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Matched</h3>
              <p className="text-gray-600">
                Our platform will match you with someone who wants to discuss the same topic. You can filter by language and region.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold mb-4">
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
      <div className="bg-secondary py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-primary mb-6">
            Ready to join the conversation?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-3xl mx-auto">
            Sign up now and start connecting with people from around the world through meaningful discussions.
          </p>
          {user ? (
            <Link href="/videochat" className="btn-primary inline-flex items-center">
              <FaVideo className="mr-2" />
              Start a Discussion
            </Link>
          ) : (
            <Link href="/auth" className="btn-primary inline-flex items-center">
              Sign Up Now
              <FaArrowRight className="ml-2" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
