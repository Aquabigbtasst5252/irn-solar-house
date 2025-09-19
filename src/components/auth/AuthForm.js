import React from 'react';

/**
 * A reusable form component for authentication screens (Sign In, Forgot Password).
 * @param {object} props - The component's properties.
 * @param {string} props.title - The title to display at the top of the form (e.g., "Staff Sign In").
 * @param {Array<object>} props.fields - An array of objects, each defining an input field.
 * @param {string} props.buttonText - The text for the submit button.
 * @param {Function} props.onSubmit - The function to call when the form is submitted.
 * @param {string} props.error - An error message to display, if any.
 * @param {React.ReactNode} props.children - Additional content to render below the form (e.g., links, social login buttons).
 * @returns {React.ReactElement} The styled authentication form component.
 */
const AuthForm = ({ title, fields, buttonText, onSubmit, error, children }) => (
  <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
    <div className="flex flex-col items-center">
      <img
        src="https://i.imgur.com/VtqESiF.png"
        alt="IRN Solar House Logo"
        className="h-24 w-auto mb-4"
      />
      <h2 className="text-3xl font-bold text-center text-gray-800">{title}</h2>
    </div>

    <form className="space-y-6" onSubmit={onSubmit}>
      {fields.map(field => (
        <div key={field.id}>
          <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
            {field.label}
          </label>
          <input
            id={field.id}
            name={field.id}
            type={field.type}
            required={field.required}
            className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={field.placeholder}
          />
        </div>
      ))}

      {/* Display error message if one exists */}
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {buttonText}
        </button>
      </div>
    </form>
    
    {/* Render any additional elements passed to the component */}
    {children}
  </div>
);

export default AuthForm;
