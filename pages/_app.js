import '@/styles/globals.css';
import { AuthProvider } from '@/contexts';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from '@/components/layout/MainLayout';

function MyApp({ Component, pageProps }) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => (
    <AuthProvider>
      <MainLayout>{page}</MainLayout>
    </AuthProvider>
  ));

  return (
    <>
      {getLayout(<Component {...pageProps} />)}
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default MyApp; 