// This file intentionally exports an undefined firebase config to make the
// repo simpler for local development. The app reads runtime Firebase
// configuration from the browser (localStorage) or from `services/firebase.ts`.
export const firebaseConfig = undefined;

export default firebaseConfig;
