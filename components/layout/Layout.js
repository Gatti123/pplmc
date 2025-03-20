import Navbar from './Navbar';
import Footer from './Footer';
import { useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { useRouter } from 'next/router';

const Layout = ({ children }) => {
  const { user } = useContext(UserContext);
  const router = useRouter();
  
  // Don't show navbar and footer on auth page
  const isAuthPage = router.pathname === '/auth';
  
  // Don't show navbar and footer on video chat page
  const isVideoChatPage = router.pathname === '/videochat';

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthPage && !isVideoChatPage && <Navbar />}
      <main className={`flex-grow ${!isAuthPage && !isVideoChatPage ? 'pt-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      {!isAuthPage && !isVideoChatPage && <Footer />}
    </div>
  );
};

export default Layout; 