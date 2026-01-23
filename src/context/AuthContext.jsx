import { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    linkWithPopup,
    unlink,
} from 'firebase/auth';
import { auth, googleProvider, githubProvider, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext();

// 権限ページ一覧
export const PERMISSION_PAGES = {
    dashboard: { label: 'ダッシュボード', icon: 'dashboard' },
    projects: { label: '撮影管理', icon: 'photo_camera' },
    models: { label: 'モデル管理', icon: 'person' },
    props: { label: '小物管理', icon: 'inventory_2' },
    delivery: { label: '納品管理', icon: 'cloud_upload' },
    settings: { label: '設定', icon: 'settings' },
    register: { label: '新規登録', icon: 'add_circle' },
};

// デフォルトのユーザー権限（オーナー）
const DEFAULT_OWNER_PERMISSIONS = {
    dashboard: { view: true, edit: true },
    projects: { view: true, edit: true },
    models: { view: true, edit: true },
    props: { view: true, edit: true },
    delivery: { view: true, edit: true },
    settings: { view: true, edit: true },
    register: { view: true, edit: true },
};

// デフォルトのメンバー権限（閲覧のみ）
const DEFAULT_MEMBER_PERMISSIONS = {
    dashboard: { view: true, edit: false },
    projects: { view: true, edit: false },
    models: { view: true, edit: false },
    props: { view: true, edit: false },
    delivery: { view: true, edit: false },
    settings: { view: false, edit: false },
    register: { view: false, edit: false },
};

export const AuthProvider = ({ children }) => {
    // Firebase認証状態
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 現在のユーザー情報
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('shooting-master-current-user');
        return saved ? JSON.parse(saved) : {
            id: 'owner',
            email: '',
            name: 'オーナー',
            role: 'owner',
            isLoggedIn: true,
            photoURL: null,
            linkedProviders: [],
        };
    });

    // 招待されたメンバー一覧
    const [members, setMembers] = useState(() => {
        const saved = localStorage.getItem('shooting-master-members');
        return saved ? JSON.parse(saved) : [];
    });

    // 権限設定
    const [permissions, setPermissions] = useState(() => {
        const saved = localStorage.getItem('shooting-master-permissions');
        if (saved) return JSON.parse(saved);
        return {
            owner: DEFAULT_OWNER_PERMISSIONS,
        };
    });

    // Firebase認証状態の監視
    useEffect(() => {
        if (!isFirebaseConfigured() || !auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setFirebaseUser(user);
            if (user) {
                // Firebaseユーザー情報から現在のユーザーを更新
                const linkedProviders = user.providerData.map(p => p.providerId);
                const existingMember = members.find(m => m.email === user.email);

                if (existingMember) {
                    // 既存メンバーの場合
                    setCurrentUser({
                        ...existingMember,
                        photoURL: user.photoURL,
                        linkedProviders,
                        isLoggedIn: true,
                    });
                } else {
                    // 新規またはオーナーの場合
                    setCurrentUser(prev => ({
                        ...prev,
                        id: prev.id || 'owner',
                        email: user.email,
                        name: user.displayName || prev.name || 'ユーザー',
                        photoURL: user.photoURL,
                        linkedProviders,
                        isLoggedIn: true,
                    }));
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [members]);

    // 変更をlocalStorageに保存
    useEffect(() => {
        localStorage.setItem('shooting-master-current-user', JSON.stringify(currentUser));
    }, [currentUser]);

    useEffect(() => {
        localStorage.setItem('shooting-master-members', JSON.stringify(members));
    }, [members]);

    useEffect(() => {
        localStorage.setItem('shooting-master-permissions', JSON.stringify(permissions));
    }, [permissions]);

    // Googleでログイン
    const signInWithGoogle = async () => {
        if (!isFirebaseConfigured() || !auth || !googleProvider) {
            return { success: false, message: 'Firebaseが設定されていません' };
        }
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google login error:', error);
            return { success: false, message: error.message };
        }
    };

    // GitHubでログイン
    const signInWithGithub = async () => {
        if (!isFirebaseConfigured() || !auth || !githubProvider) {
            return { success: false, message: 'Firebaseが設定されていません' };
        }
        try {
            const result = await signInWithPopup(auth, githubProvider);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('GitHub login error:', error);
            return { success: false, message: error.message };
        }
    };

    // GitHubアカウントを連携
    const linkGithubAccount = async () => {
        if (!isFirebaseConfigured() || !auth?.currentUser || !githubProvider) {
            return { success: false, message: 'ログインしていないか、Firebaseが設定されていません' };
        }
        try {
            const result = await linkWithPopup(auth.currentUser, githubProvider);
            const linkedProviders = result.user.providerData.map(p => p.providerId);
            setCurrentUser(prev => ({ ...prev, linkedProviders }));
            return { success: true, user: result.user };
        } catch (error) {
            console.error('GitHub link error:', error);
            if (error.code === 'auth/credential-already-in-use') {
                return { success: false, message: 'このGitHubアカウントは既に別のアカウントに連携されています' };
            }
            return { success: false, message: error.message };
        }
    };

    // Googleアカウントを連携
    const linkGoogleAccount = async () => {
        if (!isFirebaseConfigured() || !auth?.currentUser || !googleProvider) {
            return { success: false, message: 'ログインしていないか、Firebaseが設定されていません' };
        }
        try {
            const result = await linkWithPopup(auth.currentUser, googleProvider);
            const linkedProviders = result.user.providerData.map(p => p.providerId);
            setCurrentUser(prev => ({ ...prev, linkedProviders }));
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google link error:', error);
            if (error.code === 'auth/credential-already-in-use') {
                return { success: false, message: 'このGoogleアカウントは既に別のアカウントに連携されています' };
            }
            return { success: false, message: error.message };
        }
    };

    // プロバイダーの連携を解除
    const unlinkProvider = async (providerId) => {
        if (!isFirebaseConfigured() || !auth?.currentUser) {
            return { success: false, message: 'ログインしていません' };
        }
        try {
            await unlink(auth.currentUser, providerId);
            const linkedProviders = auth.currentUser.providerData.map(p => p.providerId);
            setCurrentUser(prev => ({ ...prev, linkedProviders }));
            return { success: true };
        } catch (error) {
            console.error('Unlink error:', error);
            return { success: false, message: error.message };
        }
    };

    // ログアウト
    const logout = async () => {
        if (isFirebaseConfigured() && auth) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        setCurrentUser({
            id: 'owner',
            email: '',
            name: 'オーナー',
            role: 'owner',
            isLoggedIn: true,
            photoURL: null,
            linkedProviders: [],
        });
    };

    // 招待トークンを生成
    const generateInviteToken = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    };

    // 招待リンクを生成
    const generateInviteLink = (memberId) => {
        const member = members.find(m => m.id === memberId);
        if (!member) return null;

        const token = generateInviteToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7日間有効

        // メンバーに招待トークンを保存
        setMembers(prev => prev.map(m => {
            if (m.id !== memberId) return m;
            return { ...m, inviteToken: token, inviteExpiresAt: expiresAt };
        }));

        // 招待リンクを生成（現在のURLのベースを使用）
        const baseUrl = window.location.origin + window.location.pathname;
        const inviteUrl = `${baseUrl}?invite=${token}`;

        return { url: inviteUrl, token, expiresAt };
    };

    // 招待トークンを検証してメンバーとしてログイン
    const validateInviteToken = (token) => {
        const member = members.find(m => m.inviteToken === token);

        if (!member) {
            return { success: false, message: '無効な招待リンクです' };
        }

        // 有効期限チェック
        if (member.inviteExpiresAt && new Date(member.inviteExpiresAt) < new Date()) {
            return { success: false, message: '招待リンクの有効期限が切れています' };
        }

        // メンバーをアクティブ状態に更新
        setMembers(prev => prev.map(m => {
            if (m.id !== member.id) return m;
            return { ...m, status: 'active', inviteToken: null, inviteExpiresAt: null };
        }));

        // 現在のユーザーとしてログイン
        setCurrentUser({
            ...member,
            status: 'active',
            isLoggedIn: true,
        });

        return { success: true, member };
    };

    // メンバーを招待
    const inviteMember = (email, name, customPermissions = null) => {
        if (members.find(m => m.email === email)) {
            return { success: false, message: 'このメールアドレスは既に登録されています' };
        }

        const token = generateInviteToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const newMember = {
            id: Date.now().toString(),
            email,
            name: name || email.split('@')[0],
            role: 'member',
            permissions: customPermissions || DEFAULT_MEMBER_PERMISSIONS,
            invitedAt: new Date().toISOString(),
            status: 'pending',
            inviteToken: token,
            inviteExpiresAt: expiresAt,
        };

        setMembers(prev => [...prev, newMember]);

        // 招待リンクを生成
        const baseUrl = window.location.origin + window.location.pathname;
        const inviteUrl = `${baseUrl}?invite=${token}`;

        return { success: true, member: newMember, inviteUrl };
    };

    // メンバーを削除
    const removeMember = (memberId) => {
        setMembers(prev => prev.filter(m => m.id !== memberId));
    };

    // メンバーの権限を更新
    const updateMemberPermissions = (memberId, pageKey, permissionType, value) => {
        setMembers(prev => prev.map(member => {
            if (member.id !== memberId) return member;
            return {
                ...member,
                permissions: {
                    ...member.permissions,
                    [pageKey]: {
                        ...member.permissions[pageKey],
                        [permissionType]: value,
                    },
                },
            };
        }));
    };

    // メンバーの全権限を一括更新
    const setMemberAllPermissions = (memberId, allPermissions) => {
        setMembers(prev => prev.map(member => {
            if (member.id !== memberId) return member;
            return {
                ...member,
                permissions: allPermissions,
            };
        }));
    };

    // メンバー情報を更新
    const updateMember = (memberId, updates) => {
        setMembers(prev => prev.map(member => {
            if (member.id !== memberId) return member;
            return { ...member, ...updates };
        }));
    };

    // 現在のユーザーがページの権限を持っているか確認
    const hasPermission = (pageKey, permissionType = 'view') => {
        if (currentUser.role === 'owner') {
            return true;
        }

        const member = members.find(m => m.id === currentUser.id);
        if (!member) return false;

        return member.permissions?.[pageKey]?.[permissionType] ?? false;
    };

    // 現在のユーザーが編集権限を持っているか確認
    const canEdit = (pageKey) => {
        return hasPermission(pageKey, 'edit');
    };

    // 現在のユーザーが閲覧権限を持っているか確認
    const canView = (pageKey) => {
        return hasPermission(pageKey, 'view');
    };

    // ユーザーを切り替え（テスト用・デモ用）
    const switchUser = (userId) => {
        if (userId === 'owner') {
            setCurrentUser({
                id: 'owner',
                email: '',
                name: 'オーナー',
                role: 'owner',
                isLoggedIn: true,
                photoURL: null,
                linkedProviders: [],
            });
        } else {
            const member = members.find(m => m.id === userId);
            if (member) {
                setCurrentUser({
                    ...member,
                    isLoggedIn: true,
                });
            }
        }
    };

    // メールでログイン（簡易実装 - Firebaseなしの場合）
    const loginWithEmail = (email) => {
        const settings = JSON.parse(localStorage.getItem('shooting-master-settings') || '{}');
        if (settings.ownerEmail && email === settings.ownerEmail) {
            setCurrentUser({
                id: 'owner',
                email,
                name: settings.userName || 'オーナー',
                role: 'owner',
                isLoggedIn: true,
                photoURL: null,
                linkedProviders: [],
            });
            return { success: true, role: 'owner' };
        }

        const member = members.find(m => m.email === email);
        if (member) {
            if (member.status === 'pending') {
                updateMember(member.id, { status: 'active' });
            }
            setCurrentUser({
                ...member,
                isLoggedIn: true,
            });
            return { success: true, role: 'member' };
        }

        return { success: false, message: '登録されていないメールアドレスです' };
    };

    // 権限プリセット
    const applyPermissionPreset = (memberId, preset) => {
        let permissions;
        switch (preset) {
            case 'viewer':
                permissions = {
                    dashboard: { view: true, edit: false },
                    projects: { view: true, edit: false },
                    models: { view: true, edit: false },
                    props: { view: true, edit: false },
                    delivery: { view: true, edit: false },
                    settings: { view: false, edit: false },
                    register: { view: false, edit: false },
                };
                break;
            case 'editor':
                permissions = {
                    dashboard: { view: true, edit: true },
                    projects: { view: true, edit: true },
                    models: { view: true, edit: true },
                    props: { view: true, edit: true },
                    delivery: { view: true, edit: true },
                    settings: { view: false, edit: false },
                    register: { view: true, edit: true },
                };
                break;
            case 'photographer':
                permissions = {
                    dashboard: { view: true, edit: false },
                    projects: { view: true, edit: true },
                    models: { view: true, edit: false },
                    props: { view: true, edit: true },
                    delivery: { view: true, edit: true },
                    settings: { view: false, edit: false },
                    register: { view: false, edit: false },
                };
                break;
            case 'client':
                permissions = {
                    dashboard: { view: true, edit: false },
                    projects: { view: true, edit: false },
                    models: { view: false, edit: false },
                    props: { view: true, edit: false },
                    delivery: { view: true, edit: true },
                    settings: { view: false, edit: false },
                    register: { view: false, edit: false },
                };
                break;
            case 'admin':
                permissions = DEFAULT_OWNER_PERMISSIONS;
                break;
            default:
                permissions = DEFAULT_MEMBER_PERMISSIONS;
        }
        setMemberAllPermissions(memberId, permissions);
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            firebaseUser,
            loading,
            members,
            permissions,
            isFirebaseConfigured: isFirebaseConfigured(),
            // Firebase認証
            signInWithGoogle,
            signInWithGithub,
            linkGithubAccount,
            linkGoogleAccount,
            unlinkProvider,
            logout,
            // メンバー管理
            inviteMember,
            removeMember,
            updateMemberPermissions,
            setMemberAllPermissions,
            updateMember,
            generateInviteLink,
            validateInviteToken,
            // 権限チェック
            hasPermission,
            canEdit,
            canView,
            // その他
            switchUser,
            loginWithEmail,
            applyPermissionPreset,
            PERMISSION_PAGES,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
