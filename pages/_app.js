import '../styles/globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  );
}

export default MyApp; 