import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --- Firebase Configuration ---
// This configuration object is used to connect to your Firebase project.
// It's moved here from the main app file to centralize configuration.
const firebaseConfigString = `{"apiKey":"AIzaSyDGJCxkumT_9vkKeN48REPwzE9X22f-R5k","authDomain":"irn-solar-house.firebaseapp.com","projectId":"irn-solar-house","storageBucket":"irn-solar-house.firebasestorage.app","messagingSenderId":"509848904393","appId":"1:509848904393:web:2752bb47a15f10279c6d18","measurementId":"G-G6M6DPNERN"}`;

// Initialize Firebase services and export them for use in other parts of the app.
// We use a try-catch block to handle any potential errors during initialization.
let firebaseApp, auth, db, storage;

try {
  const firebaseConfig = JSON.parse(firebaseConfigString);
  
  // Initialize the main Firebase app instance
  firebaseApp = initializeApp(firebaseConfig);
  
  // Initialize and get a reference to the Authentication service
  auth = getAuth(firebaseApp);
  
  // Initialize and get a reference to the Firestore database service
  db = getFirestore(firebaseApp);
  
  // Initialize and get a reference to the Cloud Storage service
  storage = getStorage(firebaseApp);

} catch (error) {
  console.error("Error initializing Firebase:", error);
  // You could add further error handling here, like showing a message to the user.
}

// Export the initialized services so they can be imported and used elsewhere.
export { auth, db, storage };
