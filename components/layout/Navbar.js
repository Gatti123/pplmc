import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FaUser, FaSignOutAlt, FaHome, FaVideo, FaHistory, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '@/contexts';

const Navbar = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (user) {
      try {
        await logout();
      } catch (error) {
        console.error('Error logging out:', error);
      }
    } else {
      try {
        setLoading(true);
        await signInWithGoogle();
      } catch (error) {
        console.error('Error signing in:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const NavLink = ({ href, children, icon: Icon }) => (
    <Link 
      href={href} 
      className="text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-300 hover:bg-primary-light"
    >
      {Icon && <Icon className="mr-2" />}
      {children}
    </Link>
  );

  return (
    <nav className="bg-primary shadow-lg fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-white text-2xl font-bold cursor-pointer hover:text-secondary transition-colors duration-300">
                  Polemica
                </span>
              </Link>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center">
            {user ? (
              <>
                <NavLink href="/" icon={FaHome}>Home</NavLink>
                <NavLink href="/videochat" icon={FaVideo}>Video Chat</NavLink>
                <NavLink href="/history" icon={FaHistory}>History</NavLink>
                <NavLink href="/profile" icon={FaUser}>Profile</NavLink>
                <button
                  onClick={handleAuth}
                  disabled={loading}
                  className="ml-4 text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-300 hover:bg-primary-light"
                >
                  <FaSignOutAlt className="mr-2" />
                  {loading ? 'Signing out...' : 'Sign Out'}
                </button>
              </>
            ) : (
              <button
                onClick={handleAuth}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-secondary hover:text-white p-2 rounded-md focus:outline-none"
            >
              {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-primary-dark">
          {user ? (
            <>
              <NavLink href="/" icon={FaHome}>Home</NavLink>
              <NavLink href="/videochat" icon={FaVideo}>Video Chat</NavLink>
              <NavLink href="/history" icon={FaHistory}>History</NavLink>
              <NavLink href="/profile" icon={FaUser}>Profile</NavLink>
              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full text-left text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-300 hover:bg-primary-light"
              >
                <FaSignOutAlt className="mr-2" />
                {loading ? 'Signing out...' : 'Sign Out'}
              </button>
            </>
          ) : (
            <button
              onClick={handleAuth}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 