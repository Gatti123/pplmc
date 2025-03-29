import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts';
import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-16">
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