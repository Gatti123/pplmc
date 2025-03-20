import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from '../context/UserContext';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { FaUser, FaUpload, FaGlobe, FaLanguage } from 'react-icons/fa';

const ProfileSchema = Yup.object().shape({
  displayName: Yup.string().required('Display name is required'),
  bio: Yup.string().max(200, 'Bio must be at most 200 characters'),
});

const ProfilePage = () => {
  const { user, setUser } = useContext(UserContext);
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoURL, setPhotoURL] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    // If user is not authenticated, redirect to auth page
    if (!user) {
      router.push('/auth');
      return;
    }

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          setPhotoURL(user.photoURL || '');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, router]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);

    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update user profile
      await updateProfile(user, {
        photoURL: downloadURL,
      });

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: downloadURL,
      });

      setPhotoURL(downloadURL);
      setUser({ ...user, photoURL: downloadURL });
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Update user profile
      await updateProfile(user, {
        displayName: values.displayName,
      });

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: values.displayName,
        bio: values.bio,
        preferences: {
          language: values.language,
          continent: values.continent,
        },
      });

      setUser({ ...user, displayName: values.displayName });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Your Profile</h1>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col md:flex-row items-center mb-8">
              <div className="mb-4 md:mb-0 md:mr-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {photoURL ? (
                      <img
                        src={photoURL}
                        alt={userData?.displayName || user.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-gray-400 text-4xl" />
                    )}
                  </div>
                  
                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer"
                  >
                    <FaUpload />
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                
                {uploadingPhoto && (
                  <div className="mt-2 text-center text-sm text-gray-500">
                    Uploading...
                  </div>
                )}
              </div>
              
              <div className="flex-grow">
                <h2 className="text-2xl font-bold">
                  {userData?.displayName || user.displayName}
                </h2>
                <p className="text-gray-600">{user.email}</p>
                <p className="mt-2 text-gray-700">
                  {userData?.bio || 'No bio provided'}
                </p>
              </div>
            </div>

            <Formik
              initialValues={{
                displayName: userData?.displayName || user.displayName || '',
                bio: userData?.bio || '',
                language: userData?.preferences?.language || 'en',
                continent: userData?.preferences?.continent || 'any',
              }}
              validationSchema={ProfileSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-6">
                  <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <Field
                      type="text"
                      name="displayName"
                      className="input-field"
                    />
                    <ErrorMessage name="displayName" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <Field
                      as="textarea"
                      name="bio"
                      rows="3"
                      className="input-field"
                      placeholder="Tell others about yourself..."
                    />
                    <ErrorMessage name="bio" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                        <div className="flex items-center">
                          <FaLanguage className="mr-1" />
                          Preferred Language
                        </div>
                      </label>
                      <Field
                        as="select"
                        name="language"
                        className="input-field"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="ru">Russian</option>
                        <option value="zh">Chinese</option>
                      </Field>
                    </div>
                    
                    <div>
                      <label htmlFor="continent" className="block text-sm font-medium text-gray-700 mb-1">
                        <div className="flex items-center">
                          <FaGlobe className="mr-1" />
                          Preferred Region
                        </div>
                      </label>
                      <Field
                        as="select"
                        name="continent"
                        className="input-field"
                      >
                        <option value="any">Any</option>
                        <option value="north_america">North America</option>
                        <option value="south_america">South America</option>
                        <option value="europe">Europe</option>
                        <option value="asia">Asia</option>
                        <option value="africa">Africa</option>
                        <option value="oceania">Oceania</option>
                      </Field>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 