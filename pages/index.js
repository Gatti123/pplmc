import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  const handleStartDiscussion = () => {
    if (user) {
      router.push('/videochat');
    } else {
      router.push('/auth');
    }
  };

  return (
    <>
      <Head>
        <title>Polemica - Connect through meaningful discussions</title>
        <meta name="description" content="Join meaningful discussions on various topics with like-minded people" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Connect through</span>
              <span className="block text-indigo-600">meaningful discussions</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Join thought-provoking conversations with people who share your interests. Discuss, learn, and grow together.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <button
                  onClick={handleStartDiscussion}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Start a Discussion
                </button>
              </div>
            </div>
          </div>

          <div className="mt-24">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white text-xl font-bold">
                  1
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Choose a Topic</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Select from a variety of thought-provoking topics that interest you.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white text-xl font-bold">
                  2
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Join Discussion</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Connect with others who share your interests and engage in meaningful conversations.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white text-xl font-bold">
                  3
                </div>
                <div className="ml-16">
                  <h3 className="text-lg font-medium text-gray-900">Learn & Grow</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Exchange ideas, gain new perspectives, and expand your knowledge through engaging discussions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
