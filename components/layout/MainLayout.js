import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold">
            Polemica
          </Link>
          
          {user && (
            <nav className="flex space-x-6">
              <Link href="/" className={`hover:text-indigo-200 transition-colors ${router.pathname === '/' ? 'font-semibold' : ''}`}>
                Home
              </Link>
              <Link href="/videochat" className={`hover:text-indigo-200 transition-colors ${router.pathname === '/videochat' ? 'font-semibold' : ''}`}>
                Video Chat
              </Link>
              <Link href="/history" className={`hover:text-indigo-200 transition-colors ${router.pathname === '/history' ? 'font-semibold' : ''}`}>
                History
              </Link>
              <Link href="/profile" className={`hover:text-indigo-200 transition-colors ${router.pathname === '/profile' ? 'font-semibold' : ''}`}>
                Profile
              </Link>
              <button 
                onClick={handleSignOut}
                className="hover:text-indigo-200 transition-colors"
              >
                Sign Out
              </button>
            </nav>
          )}
          
          {!user && (
            <Link href="/auth/signin" className="hover:text-indigo-200 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© {new Date().getFullYear()} Polemica. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout; 