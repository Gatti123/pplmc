import { useState } from 'react';
import { useRouter } from 'next/router';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const SignUpSchema = Yup.object().shape({
  displayName: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string()
    .min(6, 'Too Short!')
    .required('Required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Required'),
});

const SignUp = ({ onToggleForm }) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signInWithGoogle, signUpWithEmail } = useAuth();

  const handleSignUp = async (values, { setSubmitting, resetForm }) => {
    setLoading(true);
    try {
      const user = await signUpWithEmail(values.email, values.password, values.displayName);
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: values.displayName,
        email: values.email,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        preferences: {
          language: navigator.language || 'en',
          continent: 'any',
        },
        recentDiscussions: [],
      });
      
      toast.success('Account created successfully!');
      resetForm();
      router.push('/');
    } catch (error) {
      console.error('Error signing up', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
      router.push('/');
      toast.success('Successfully signed up!');
    } catch (error) {
      console.error('Error signing up with Google:', error);
      toast.error('Failed to sign up with Google');
    }
  };

  return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-primary mb-6 text-center">Sign Up</h2>
      
      <Formik
        initialValues={{ displayName: '', email: '', password: '', confirmPassword: '' }}
        validationSchema={SignUpSchema}
        onSubmit={handleSignUp}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <Field
                type="text"
                name="displayName"
                className="input-field"
                placeholder="Enter your display name"
              />
              <ErrorMessage name="displayName" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Field
                type="email"
                name="email"
                className="input-field"
                placeholder="Enter your email"
              />
              <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Field
                type="password"
                name="password"
                className="input-field"
                placeholder="Enter your password"
              />
              <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <Field
                type="password"
                name="confirmPassword"
                className="input-field"
                placeholder="Confirm your password"
              />
              <ErrorMessage name="confirmPassword" component="div" className="text-red-500 text-sm mt-1" />
            </div>
            
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isSubmitting || loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </Form>
        )}
      </Formik>
      
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button
          onClick={handleGoogleSignUp}
          className="text-primary hover:underline"
        >
          Sign In with Google
        </button>
      </p>
    </div>
  );
};

export default SignUp; 