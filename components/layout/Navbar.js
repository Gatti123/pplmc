import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FaUser, FaSignOutAlt, FaHome, FaVideo, FaHistory, FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '@/contexts';

const Navbar = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Successfully signed out!');
      setIsOpen(false);
    } catch (error) {
      console.error('Error signing out', error);
      toast.error(error.message);
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
                  onClick={handleSignOut}
                  className="ml-4 text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-300 hover:bg-primary-light"
                >
                  <FaSignOutAlt className="mr-2" />
                  Sign Out
                </button>
              </>
            ) : (
              <NavLink href="/auth">Sign In</NavLink>
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
                onClick={handleSignOut}
                className="w-full text-left text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center transition-all duration-300 hover:bg-primary-light"
              >
                <FaSignOutAlt className="mr-2" />
                Sign Out
              </button>
            </>
          ) : (
            <NavLink href="/auth">Sign In</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 