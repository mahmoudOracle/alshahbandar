
# Alshabandar Business Suite - Deployment Guide

This guide provides the steps to build the application for production and deploy it to Firebase Hosting.

## Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js (v18 or later) and npm installed.
2.  **Firebase CLI:** You must have the Firebase Command Line Interface installed globally. If not, run:
    ```bash
    npm install -g firebase-tools
    ```
3.  **Firebase Project:** You must have a Firebase project created and configured with Authentication and Firestore, as described in the setup guide.

## Deployment Steps

1.  **Log in to Firebase:**
    Open your terminal in the project root directory and run the following command. This will open a browser window for you to log in to your Google account associated with Firebase.
    ```bash
    firebase login
    ```

2.  **Initialize Firebase Hosting (One-Time Setup):**
    If you have never set up Firebase Hosting for this project directory before, you need to initialize it.
    ```bash
    firebase init hosting
    ```
    When prompted:
    -   Select **"Use an existing project"** and choose your `al-shahbandar` project from the list.
    -   For "What do you want to use as your public directory?", enter **`dist`**.
    -   For "Configure as a single-page app (rewrite all urls to /index.html)?", answer **Yes (y)**.
    -   For "Set up automatic builds and deploys with GitHub?", answer **No (n)** for now.
    -   It will say `firebase.json` already exists. **Do not overwrite it.**

3.  **Install Dependencies:**
    Make sure all project dependencies are installed.
    ```bash
    npm install
    ```

4.  **Build for Production:**
    Run the build script. This will compile the React/TypeScript code into optimized static files inside the `dist` directory.
    ```bash
    npm run build
    ```
    *Note: This command should be defined in your `package.json` file, typically as `vite build`.*

5.  **Deploy to Firebase Hosting:**
    After the build is complete, deploy the contents of the `dist` folder to Firebase Hosting.
    ```bash
    firebase deploy --only hosting
    ```

    The command will output the URL where your application is live. Your deployment is complete!
