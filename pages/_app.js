import '@/styles/globals.css';
import { AuthProvider } from '@/contexts';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainLayout from '@/components/layout/MainLayout';
import { Provider } from 'react-redux';
import { store } from '@/store';
import ErrorBoundary from '@/components/common/ErrorBoundary';

function MyApp({ Component, pageProps }) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout || ((page) => (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthProvider>
          <MainLayout>{page}</MainLayout>
        </AuthProvider>
      </Provider>
    </ErrorBoundary>
  ));

  return (
    <>
      {getLayout(<Component {...pageProps} />)}
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default MyApp; 