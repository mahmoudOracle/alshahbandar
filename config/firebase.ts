import { FirebaseOptions } from 'firebase/app';

/**
 * Firebase configuration object.
 * By embedding this in the code, we ensure it's always available at build time,
 * avoiding any runtime fetching issues.
 */
export const firebaseConfig: FirebaseOptions = {
  "apiKey": "AIzaSyBXF-T-5_3a_p5DLx6mtVcXU6oMpC5F488",
  "authDomain": "al-shahbandar.firebaseapp.com",
  "projectId": "al-shahbandar",
  "storageBucket": "al-shahbandar.appspot.com",
  "messagingSenderId": "246101313051",
  "appId": "1:246101313051:web:706ec12d5d23ec56eb9abe",
  "measurementId": "G-3GQQHQN8QP"
};
