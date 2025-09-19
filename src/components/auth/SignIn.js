import React, { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { getUserProfile } from '../../utils/helpers';
import AuthForm from './AuthForm';

/**
 * Handles the user sign-in process, including email/password and Google authentication.
 * @param {object} props - The component's properties.
 * @param {Function} props.setView - Function to change the current application view (e.g., to 'forgot-password').
 * @param {Function} props.onLoginSuccess - Callback function executed after a successful login, passing the user profile.
 * @returns {React.ReactElement} The sign-in component.
 */
const SignIn = ({ setView, onLoginSuccess }) => {
  const [error, setError] = useState('');

  /**
   * Handles the form submission for email and password sign-in.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    const { email, password } = e.target.elements;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const userProfile = await getUserProfile(userCredential.user.uid);
      onLoginSuccess(userProfile);
    } catch (err) {
      console.error("Sign-in error:", err);
      // Provide a more user-friendly error message
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  /**
   * Initiates the Google Sign-In popup flow.
   * If the user is new, it creates a new user profile document in Firestore.
   */
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setError('');
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        let userProfile = await getUserProfile(user.uid);

        // If no profile exists, create a new one with 'pending' role
        if (!userProfile) {
            const newUserProfile = {
                email: user.email,
                displayName: user.displayName,
                role: 'pending', // New users start with a pending role
                createdAt: Timestamp.now(),
            };
            await setDoc(doc(db, 'users', user.uid), newUserProfile);
            userProfile = newUserProfile;
        }
        onLoginSuccess(userProfile);
    } catch (err) {
        console.error("Google sign-in error:", err);
        setError(err.message);
    }
  };

  return (
    <AuthForm
      title="Staff Sign In"
      fields={[
        { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
        { id: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
      ]}
      buttonText="Sign In"
      onSubmit={handleSignIn}
      error={error}
    >
        {/* Additional content: separator, Google button, and links */}
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div>
        </div>
        <div>
            <button type="button" onClick={handleGoogleSignIn} className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Sign in with Google
            </button>
        </div>
        <div className="text-sm text-center mt-4">
            <a href="#" onClick={() => setView('forgot-password')} className="font-medium text-blue-600 hover:text-blue-500">
                Forgot password?
            </a>
        </div>
        <div className="text-sm text-center mt-4">
            <a href="#" onClick={() => setView('homepage')} className="font-medium text-gray-600 hover:text-gray-500">
                ← Back to Homepage
            </a>
        </div>
    </AuthForm>
  );
};

export default SignIn;
