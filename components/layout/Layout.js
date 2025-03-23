import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts';

const Layout = ({ children }) => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Home */}
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold">Polemica</span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors
                  ${router.pathname === '/' ? 'bg-primary-dark' : ''}`}
              >
                Home
              </Link>
              
              <Link 
                href="/videochat" 
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors
                  ${router.pathname === '/videochat' ? 'bg-primary-dark' : ''}`}
              >
                Video Chat
              </Link>
              
              <Link 
                href="/history" 
                className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors
                  ${router.pathname === '/history' ? 'bg-primary-dark' : ''}`}
              >
                History
              </Link>

              {user && (
                <>
                  <Link 
                    href="/profile" 
                    className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors
                      ${router.pathname === '/profile' ? 'bg-primary-dark' : ''}`}
                  >
                    Profile
                  </Link>
                  
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout; 