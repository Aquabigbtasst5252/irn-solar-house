import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import AuthForm from './AuthForm';

/**
 * A component that allows users to request a password reset email.
 * @param {object} props - The component's properties.
 * @param {Function} props.setView - Function to change the current application view (e.g., back to 'signin').
 * @returns {React.ReactElement} The forgot password component.
 */
const ForgotPassword = ({ setView }) => {
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    /**
     * Handles the form submission to send a password reset email.
     * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
     */
    const handlePasswordReset = async (e) => {
      e.preventDefault();
      const { email } = e.target.elements;
      setError('');
      setMessage('');
      try {
        await sendPasswordResetEmail(auth, email.value);
        setMessage("Password reset email sent! Please check your inbox.");
      } catch (err) {
        console.error("Password reset error:", err);
        setError("Failed to send reset email. Please ensure the email address is correct and try again.");
      }
    };

    return (
      <AuthForm
        title="Reset Your Password"
        fields={[{ id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' }]}
        buttonText="Send Reset Link"
        onSubmit={handlePasswordReset}
        error={error}
      >
        {/* Display a success message if the email was sent */}
        {message && <p className="text-sm text-green-600 text-center mt-4">{message}</p>}
        
        {/* Link to go back to the sign-in page */}
        <div className="text-sm text-center mt-4">
            <a href="#" onClick={() => setView('signin')} className="font-medium text-blue-600 hover:text-blue-500">
                Back to Sign In
            </a>
        </div>
      </AuthForm>
    );
};

export default ForgotPassword;
