import { useState, useContext } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { UserContext } from '../../context/UserContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';

const SignUpSchema = Yup.object().shape({
  displayName: Yup.string().required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Required'),
});

const SignUp = ({ onToggleForm }) => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(UserContext);

  const handleSignUp = async (values, { setSubmitting, resetForm }) => {
    setLoading(true);
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: values.displayName,
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: values.displayName,
        email: values.email,
        photoURL: userCredential.user.photoURL || '',
        createdAt: new Date().toISOString(),
        preferences: {
          language: navigator.language || 'en',
          continent: 'any',
        },
        recentDiscussions: [],
      });
      
      setUser(userCredential.user);
      toast.success('Account created successfully!');
      resetForm();
    } catch (error) {
      console.error('Error signing up', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
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
          onClick={onToggleForm}
          className="text-primary hover:underline"
        >
          Sign In
        </button>
      </p>
    </div>
  );
};

export default SignUp; 