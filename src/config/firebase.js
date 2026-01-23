import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

// Firebase設定
// 注意: 本番環境では環境変数から読み込むことを推奨
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Firebaseが設定されているかチェック
export const isFirebaseConfigured = () => {
    return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
};

// Firebase初期化
let app = null;
let auth = null;
let googleProvider = null;
let githubProvider = null;

if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();

    // GitHub OAuth スコープを追加
    githubProvider.addScope('read:user');
    githubProvider.addScope('user:email');
}

export { app, auth, googleProvider, githubProvider };
