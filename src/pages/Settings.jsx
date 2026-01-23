import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';
import { useModels } from '../context/ModelContext';
import { useAuth, PERMISSION_PAGES } from '../context/AuthContext';
import { syncApi } from '../services/api';
import { uploadProjectImagesToR2, uploadModelImageToR2, isBase64Image } from '../services/imageService';

const Settings = () => {
    // 設定値をlocalStorageから読み込み
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('shooting-master-settings');
        return saved ? JSON.parse(saved) : {
            // AI設定
            geminiApiKey: '',
            aiModel: 'gemini-2.0-flash-exp',
            // ユーザー設定
            userRole: 'client', // 'client' or 'photographer'
            userName: '',
            companyName: '',
            // 表示設定
            showCompletedProjects: true,
            defaultView: 'grid', // 'grid' or 'list'
        };
    });

    // モーダル状態
    const [showApiModal, setShowApiModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDataModal, setShowDataModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showMemberEditModal, setShowMemberEditModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    // 一時入力値
    const [tempApiKey, setTempApiKey] = useState(settings.geminiApiKey);
    const [tempAiModel, setTempAiModel] = useState(settings.aiModel);
    const [tempUserRole, setTempUserRole] = useState(settings.userRole);
    const [tempUserName, setTempUserName] = useState(settings.userName);
    const [tempCompanyName, setTempCompanyName] = useState(settings.companyName);

    // 招待用の一時入力値
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [invitePreset, setInvitePreset] = useState('viewer');
    const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
    const [showInviteLink, setShowInviteLink] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // 再招待用
    const [reinviteMemberId, setReinviteMemberId] = useState(null);
    const [reinviteUrl, setReinviteUrl] = useState('');
    const [reinviteCopySuccess, setReinviteCopySuccess] = useState(false);

    const { projects, syncStatus: projectSyncStatus, syncToCloud: syncProjectsToCloud, fetchFromCloud: fetchProjectsFromCloud } = useProjects();
    const { models, syncStatus: modelSyncStatus, syncToCloud: syncModelsToCloud, fetchFromCloud: fetchModelsFromCloud } = useModels();

    // クラウド同期状態
    const [cloudSyncing, setCloudSyncing] = useState(false);
    const [cloudSyncMessage, setCloudSyncMessage] = useState('');

    // R2マイグレーション状態
    const [migrating, setMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState('');

    const {
        currentUser,
        members,
        inviteMember,
        removeMember,
        updateMemberPermissions,
        applyPermissionPreset,
        generateInviteLink,
    } = useAuth();

    // 設定をlocalStorageに保存
    useEffect(() => {
        localStorage.setItem('shooting-master-settings', JSON.stringify(settings));
    }, [settings]);

    // API設定保存
    const handleSaveApiSettings = () => {
        setSettings(prev => ({
            ...prev,
            geminiApiKey: tempApiKey,
            aiModel: tempAiModel,
        }));
        setShowApiModal(false);
    };

    // ユーザー設定保存
    const handleSaveUserSettings = () => {
        setSettings(prev => ({
            ...prev,
            userRole: tempUserRole,
            userName: tempUserName,
            companyName: tempCompanyName,
        }));
        setShowUserModal(false);
    };

    // データリセット
    const handleResetData = () => {
        if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            localStorage.removeItem('shooting-master-projects');
            localStorage.removeItem('shooting-master-models');
            localStorage.removeItem('shooting-master-settings');
            window.location.reload();
        }
    };

    // データエクスポート
    const handleExportData = () => {
        const data = {
            projects: JSON.parse(localStorage.getItem('shooting-master-projects') || '[]'),
            models: JSON.parse(localStorage.getItem('shooting-master-models') || '[]'),
            settings: JSON.parse(localStorage.getItem('shooting-master-settings') || '{}'),
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shooting-master-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // データインポート
    const handleImportData = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // インポート内容の詳細を計算
                const projectCount = data.projects?.length || 0;
                const cutCount = (data.projects || []).reduce((sum, p) => sum + (p.cuts?.length || 0), 0);
                const propCount = (data.projects || []).reduce((sum, p) => sum + (p.props?.length || 0), 0);
                const modelCount = data.models?.length || 0;

                // 確認ダイアログ
                const confirmMessage = `以下のデータをインポートします:\n\n` +
                    `・プロジェクト: ${projectCount}件\n` +
                    `・カット: ${cutCount}件\n` +
                    `・小物: ${propCount}件\n` +
                    `・モデル: ${modelCount}件\n\n` +
                    `現在のデータは上書きされます。続行しますか？`;

                if (!confirm(confirmMessage)) {
                    // ファイル選択をリセット
                    e.target.value = '';
                    return;
                }

                if (data.projects) {
                    localStorage.setItem('shooting-master-projects', JSON.stringify(data.projects));
                }
                if (data.models) {
                    localStorage.setItem('shooting-master-models', JSON.stringify(data.models));
                }
                if (data.settings) {
                    localStorage.setItem('shooting-master-settings', JSON.stringify(data.settings));
                }
                alert('データをインポートしました。ページを再読み込みします。');
                window.location.reload();
            } catch (err) {
                alert('インポートに失敗しました。ファイル形式を確認してください。');
            }
        };
        reader.readAsText(file);
    };

    // APIキーをマスク表示
    const maskApiKey = (key) => {
        if (!key) return '未設定';
        if (key.length <= 8) return '••••••••';
        return key.slice(0, 4) + '••••••••' + key.slice(-4);
    };

    // ユーザーロール表示
    const getRoleLabel = (role) => {
        return role === 'photographer' ? 'カメラマン' : 'クライアント';
    };

    // Base64画像の数をカウント
    const countBase64Images = () => {
        let count = 0;
        projects.forEach(project => {
            if (isBase64Image(project.productImage)) count++;
            (project.cuts || []).forEach(cut => {
                if (isBase64Image(cut.originalImage)) count++;
                if (isBase64Image(cut.aiGeneratedImage)) count++;
            });
            (project.props || []).forEach(prop => {
                if (isBase64Image(prop.image)) count++;
            });
        });
        models.forEach(model => {
            if (isBase64Image(model.image)) count++;
        });
        return count;
    };

    // 既存データをR2にマイグレーション
    const handleMigrateToR2 = async () => {
        const base64Count = countBase64Images();
        if (base64Count === 0) {
            alert('マイグレーション対象の画像がありません');
            return;
        }

        if (!confirm(`${base64Count}件のBase64画像をクラウドストレージに移行します。\nこれによりlocalStorageの容量が大幅に削減されます。\n\n続行しますか？`)) {
            return;
        }

        setMigrating(true);
        setMigrationProgress('プロジェクト画像をアップロード中...');
        const userId = 'owner';

        try {
            // 1. プロジェクトの画像をR2にアップロード
            const migratedProjects = [];
            for (let i = 0; i < projects.length; i++) {
                setMigrationProgress(`プロジェクト ${i + 1}/${projects.length} を処理中...`);
                const migratedProject = await uploadProjectImagesToR2(projects[i], userId);
                migratedProjects.push(migratedProject);
            }

            // 2. モデルの画像をR2にアップロード
            setMigrationProgress('モデル画像をアップロード中...');
            const migratedModels = [];
            for (let i = 0; i < models.length; i++) {
                setMigrationProgress(`モデル ${i + 1}/${models.length} を処理中...`);
                const migratedModel = await uploadModelImageToR2(models[i], userId);
                migratedModels.push(migratedModel);
            }

            // 3. localStorageに保存
            setMigrationProgress('データを保存中...');
            localStorage.setItem('shooting-master-projects', JSON.stringify(migratedProjects));
            localStorage.setItem('shooting-master-models', JSON.stringify(migratedModels));

            // 4. クラウドにも同期
            setMigrationProgress('クラウドに同期中...');
            await syncApi.syncAll(userId, { projects: migratedProjects, models: migratedModels });

            setMigrationProgress('');
            alert('マイグレーション完了！ページを再読み込みします。');
            window.location.reload();
        } catch (error) {
            console.error('Migration error:', error);
            setMigrationProgress('');
            alert('マイグレーションに失敗しました: ' + error.message);
        }

        setMigrating(false);
    };

    // クラウドと双方向同期
    const handleCloudSync = async () => {
        setCloudSyncing(true);
        setCloudSyncMessage('');
        try {
            // 1. まずクラウドからダウンロード（マージ）
            const projectResult = await fetchProjectsFromCloud();
            const modelResult = await fetchModelsFromCloud();

            // 2. ローカルデータをクラウドにアップロード
            const userId = 'owner';
            await syncApi.syncAll(userId, { projects, models });

            if (projectResult?.success || modelResult?.success) {
                setCloudSyncMessage('同期が完了しました');
            } else {
                setCloudSyncMessage('同期が完了しました');
            }
        } catch (error) {
            console.error('Cloud sync error:', error);
            setCloudSyncMessage('同期に失敗しました: ' + error.message);
        }
        setCloudSyncing(false);
    };

    return (
        <Layout activeNav="settings">
        <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8 bg-background-light dark:bg-background-dark">
            <Header title="設定" showBack={false} rightIcon="help" />

            <main className="p-4 lg:p-6 space-y-6">
                {/* AI画像生成設定 */}
                <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        AI画像生成
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => {
                                setTempApiKey(settings.geminiApiKey);
                                setTempAiModel(settings.aiModel);
                                setShowApiModal(true);
                            }}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-purple-500">key</span>
                                <div className="text-left">
                                    <p className="text-sm font-bold">Gemini API設定</p>
                                    <p className="text-[11px] text-gray-500">
                                        {settings.geminiApiKey ? maskApiKey(settings.geminiApiKey) : 'APIキーを設定してください'}
                                    </p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </button>
                    </div>
                    {!settings.geminiApiKey && (
                        <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">warning</span>
                            AI画像生成を使用するにはAPIキーが必要です
                        </p>
                    )}
                </section>

                {/* ユーザー設定 */}
                <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">person</span>
                        ユーザー設定
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => {
                                setTempUserRole(settings.userRole);
                                setTempUserName(settings.userName);
                                setTempCompanyName(settings.companyName);
                                setShowUserModal(true);
                            }}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-500">badge</span>
                                <div className="text-left">
                                    <p className="text-sm font-bold">プロフィール</p>
                                    <p className="text-[11px] text-gray-500">
                                        {settings.userName || '未設定'} / {getRoleLabel(settings.userRole)}
                                    </p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </button>
                    </div>
                </section>

                {/* 権限管理 */}
                {currentUser.role === 'owner' && (
                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                            権限管理
                        </h3>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                            {/* メンバー招待ボタン */}
                            <button
                                onClick={() => {
                                    setInviteEmail('');
                                    setInviteName('');
                                    setInvitePreset('viewer');
                                    setShowInviteModal(true);
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-green-500">person_add</span>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">メンバーを招待</p>
                                        <p className="text-[11px] text-gray-500">
                                            メールアドレスで共有
                                        </p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-gray-400">add</span>
                            </button>

                            {/* 権限管理ボタン */}
                            <button
                                onClick={() => setShowPermissionModal(true)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-purple-500">shield_person</span>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">メンバー権限</p>
                                        <p className="text-[11px] text-gray-500">
                                            {members.length}名のメンバー
                                        </p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                            </button>
                        </div>
                        {members.length === 0 && (
                            <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">info</span>
                                メンバーを招待して共同作業しましょう
                            </p>
                        )}
                    </section>
                )}

                {/* 表示設定 */}
                <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">palette</span>
                        表示設定
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">visibility</span>
                                <div>
                                    <p className="text-sm font-bold">完了済みプロジェクト</p>
                                    <p className="text-[11px] text-gray-500">一覧に表示する</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, showCompletedProjects: !prev.showCompletedProjects }))}
                                className={`relative w-12 h-7 rounded-full transition-colors ${settings.showCompletedProjects ? 'bg-primary' : 'bg-gray-300'}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.showCompletedProjects ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>
                    </div>
                </section>

                {/* クラウド同期 */}
                <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">cloud_sync</span>
                        クラウド同期
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                        {/* 同期ステータス */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {(projectSyncStatus === 'syncing' || modelSyncStatus === 'syncing' || cloudSyncing) ? (
                                        <>
                                            <span className="material-symbols-outlined text-blue-500 animate-spin">sync</span>
                                            <span className="text-sm font-medium text-blue-600">同期中...</span>
                                        </>
                                    ) : (projectSyncStatus === 'error' || modelSyncStatus === 'error') ? (
                                        <>
                                            <span className="material-symbols-outlined text-red-500">cloud_off</span>
                                            <span className="text-sm font-medium text-red-600">同期エラー</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-green-500">cloud_done</span>
                                            <span className="text-sm font-medium text-green-600">同期済み</span>
                                        </>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {(() => {
                                        // localStorageの使用量を計算
                                        try {
                                            const projectsSize = (localStorage.getItem('shooting-master-projects') || '').length;
                                            const modelsSize = (localStorage.getItem('shooting-master-models') || '').length;
                                            const totalKB = Math.round((projectsSize + modelsSize) / 1024);
                                            const percentage = Math.round((totalKB / 5120) * 100);
                                            return `${totalKB}KB / 5MB (${percentage}%)`;
                                        } catch {
                                            return '計測不可';
                                        }
                                    })()}
                                </span>
                            </div>
                            {/* データ詳細 */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                    <p className="text-sm font-bold text-primary">{projects.length}</p>
                                    <p className="text-[9px] text-gray-500">プロジェクト</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                    <p className="text-sm font-bold text-amber-500">
                                        {projects.reduce((sum, p) => sum + (p.cuts?.length || 0), 0)}
                                    </p>
                                    <p className="text-[9px] text-gray-500">カット</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                    <p className="text-sm font-bold text-blue-500">
                                        {projects.reduce((sum, p) => sum + (p.props?.length || 0), 0)}
                                    </p>
                                    <p className="text-[9px] text-gray-500">小物</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                                    <p className="text-sm font-bold text-pink-500">{models.length}</p>
                                    <p className="text-[9px] text-gray-500">モデル</p>
                                </div>
                            </div>
                        </div>

                        {/* 今すぐ同期 */}
                        <button
                            onClick={handleCloudSync}
                            disabled={cloudSyncing}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">sync</span>
                                <div className="text-left">
                                    <p className="text-sm font-bold">今すぐ同期</p>
                                    <p className="text-[11px] text-gray-500">
                                        他のデバイスとデータを同期
                                    </p>
                                </div>
                            </div>
                            {cloudSyncing ? (
                                <span className="material-symbols-outlined animate-spin text-gray-400">sync</span>
                            ) : (
                                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                            )}
                        </button>

                        {/* 画像をクラウドに移行 */}
                        {countBase64Images() > 0 && (
                            <button
                                onClick={handleMigrateToR2}
                                disabled={migrating}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 border-t border-gray-100 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-amber-500">cloud_upload</span>
                                    <div className="text-left">
                                        <p className="text-sm font-bold">画像をクラウドに移行</p>
                                        <p className="text-[11px] text-gray-500">
                                            {migrating ? migrationProgress : `${countBase64Images()}件の画像を移行してストレージを節約`}
                                        </p>
                                    </div>
                                </div>
                                {migrating ? (
                                    <span className="material-symbols-outlined animate-spin text-amber-500">sync</span>
                                ) : (
                                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* エラー/成功メッセージ */}
                    {cloudSyncMessage && (
                        <div className={`mt-2 p-3 rounded-xl flex items-start gap-2 ${
                            cloudSyncMessage.includes('失敗') || cloudSyncMessage.includes('エラー')
                                ? 'bg-red-50 dark:bg-red-900/20'
                                : 'bg-green-50 dark:bg-green-900/20'
                        }`}>
                            <span className={`material-symbols-outlined text-sm mt-0.5 ${
                                cloudSyncMessage.includes('失敗') || cloudSyncMessage.includes('エラー')
                                    ? 'text-red-500'
                                    : 'text-green-500'
                            }`}>
                                {cloudSyncMessage.includes('失敗') || cloudSyncMessage.includes('エラー') ? 'error' : 'check_circle'}
                            </span>
                            <div className="flex-1">
                                <p className={`text-xs ${
                                    cloudSyncMessage.includes('失敗') || cloudSyncMessage.includes('エラー')
                                        ? 'text-red-700 dark:text-red-300'
                                        : 'text-green-700 dark:text-green-300'
                                }`}>
                                    {cloudSyncMessage}
                                </p>
                                {(cloudSyncMessage.includes('失敗') || cloudSyncMessage.includes('エラー')) && (
                                    <button
                                        onClick={handleCloudSync}
                                        className="mt-1 text-[10px] text-red-600 dark:text-red-400 underline"
                                    >
                                        再試行
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">info</span>
                        データは自動的にクラウドと同期されます
                    </p>
                </section>

                {/* データ管理 */}
                <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">database</span>
                        データ管理
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                        <button
                            onClick={() => setShowDataModal(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-amber-500">save</span>
                                <div className="text-left">
                                    <p className="text-sm font-bold">バックアップ・復元</p>
                                    <p className="text-[11px] text-gray-500">
                                        {projects.length}件のプロジェクト / {models.length}名のモデル
                                    </p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </button>
                    </div>
                </section>

                {/* その他 */}
                <section>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 opacity-60 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">more_horiz</span>
                        その他
                    </h3>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                        <button
                            onClick={() => setShowAboutModal(true)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">info</span>
                                <span className="text-sm font-bold">アプリについて</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                        </button>
                    </div>
                </section>

                <p className="text-center text-[10px] text-gray-400 pt-4">
                    Shooting Master v1.0.0
                </p>
            </main>

            {/* API設定モーダル */}
            {showApiModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">Gemini API設定</h3>
                            <button onClick={() => setShowApiModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">APIキー</label>
                                <input
                                    type="password"
                                    value={tempApiKey}
                                    onChange={(e) => setTempApiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Google AI Studioで取得できます
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">AIモデル</label>
                                <select
                                    value={tempAiModel}
                                    onChange={(e) => setTempAiModel(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                >
                                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp (画像生成対応・推奨)</option>
                                    <option value="gemini-3-pro-image-preview">NanoBanana Pro (高品質画像生成)</option>
                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (テキストのみ)</option>
                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (テキストのみ)</option>
                                </select>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    画像生成には「Gemini 2.0 Flash Exp」または「NanoBanana Pro」を選択してください
                                </p>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    <span className="font-bold">取得方法:</span><br />
                                    1. <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a> にアクセス<br />
                                    2. 「Get API Key」をクリック<br />
                                    3. 新しいキーを作成してコピー
                                </p>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    <span className="font-bold">画像生成について:</span><br />
                                    画像生成機能を使うには、APIキーで画像生成が有効になっている必要があります。<br />
                                    無料プランでも利用可能ですが、レート制限があります。
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowApiModal(false)}
                                className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSaveApiSettings}
                                className="flex-1 h-12 rounded-xl bg-primary text-white font-medium"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ユーザー設定モーダル */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">プロフィール設定</h3>
                            <button onClick={() => setShowUserModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">役割</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setTempUserRole('client')}
                                        className={`h-12 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
                                            tempUserRole === 'client'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">business</span>
                                        クライアント
                                    </button>
                                    <button
                                        onClick={() => setTempUserRole('photographer')}
                                        className={`h-12 rounded-xl border-2 font-medium flex items-center justify-center gap-2 transition-all ${
                                            tempUserRole === 'photographer'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">photo_camera</span>
                                        カメラマン
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">お名前</label>
                                <input
                                    type="text"
                                    value={tempUserName}
                                    onChange={(e) => setTempUserName(e.target.value)}
                                    placeholder="山田 太郎"
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">会社名・屋号</label>
                                <input
                                    type="text"
                                    value={tempCompanyName}
                                    onChange={(e) => setTempCompanyName(e.target.value)}
                                    placeholder="株式会社〇〇"
                                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowUserModal(false)}
                                className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSaveUserSettings}
                                className="flex-1 h-12 rounded-xl bg-primary text-white font-medium"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* データ管理モーダル */}
            {showDataModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">データ管理</h3>
                            <button onClick={() => setShowDataModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* 現在のデータ */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <p className="text-sm font-medium mb-2">保存されているデータ</p>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-primary">{projects.length}</p>
                                        <p className="text-[10px] text-gray-500">プロジェクト</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-amber-500">
                                            {projects.reduce((sum, p) => sum + (p.cuts?.length || 0), 0)}
                                        </p>
                                        <p className="text-[10px] text-gray-500">カット</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-blue-500">
                                            {projects.reduce((sum, p) => sum + (p.props?.length || 0), 0)}
                                        </p>
                                        <p className="text-[10px] text-gray-500">小物</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                        <p className="text-lg font-bold text-pink-500">{models.length}</p>
                                        <p className="text-[10px] text-gray-500">モデル</p>
                                    </div>
                                </div>
                            </div>

                            {/* エクスポート */}
                            <button
                                onClick={handleExportData}
                                className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-700 dark:text-blue-300"
                            >
                                <span className="material-symbols-outlined">download</span>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-bold">バックアップをエクスポート</p>
                                    <p className="text-[10px] opacity-70">JSONファイルとしてダウンロード</p>
                                </div>
                            </button>

                            {/* インポート */}
                            <label className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-300 cursor-pointer">
                                <span className="material-symbols-outlined">upload</span>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-bold">バックアップを復元</p>
                                    <p className="text-[10px] opacity-70">JSONファイルからインポート</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportData}
                                    className="hidden"
                                />
                            </label>

                            {/* リセット */}
                            <button
                                onClick={handleResetData}
                                className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400"
                            >
                                <span className="material-symbols-outlined">delete_forever</span>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-bold">すべてのデータを削除</p>
                                    <p className="text-[10px] opacity-70">この操作は取り消せません</p>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowDataModal(false)}
                            className="w-full h-12 mt-6 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* メンバー招待モーダル */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">
                                {showInviteLink ? '招待リンクを共有' : 'メンバーを招待'}
                            </h3>
                            <button onClick={() => {
                                setShowInviteModal(false);
                                setShowInviteLink(false);
                                setGeneratedInviteUrl('');
                                setCopySuccess(false);
                            }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {showInviteLink ? (
                            // 招待リンク表示画面
                            <div className="space-y-4">
                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {inviteEmail} さんを招待しました
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">招待リンク</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={generatedInviteUrl}
                                            readOnly
                                            className="flex-1 h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(generatedInviteUrl);
                                                setCopySuccess(true);
                                                setTimeout(() => setCopySuccess(false), 2000);
                                            }}
                                            className={`h-12 px-4 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                                                copySuccess
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-primary text-white'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {copySuccess ? 'check' : 'content_copy'}
                                            </span>
                                            {copySuccess ? 'コピー済み' : 'コピー'}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                        <span className="font-bold">このリンクを招待したい方に共有してください</span><br />
                                        リンクは7日間有効です。リンクを開くと自動的にメンバーとしてログインします。
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowInviteModal(false);
                                        setShowInviteLink(false);
                                        setGeneratedInviteUrl('');
                                        setInviteEmail('');
                                        setInviteName('');
                                        setCopySuccess(false);
                                    }}
                                    className="w-full h-12 rounded-xl bg-primary text-white font-medium"
                                >
                                    閉じる
                                </button>
                            </div>
                        ) : (
                            // 招待入力画面
                            <>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">メールアドレス（管理用）</label>
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="example@email.com"
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            メンバー管理用の識別に使用します（メールは送信されません）
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">表示名（任意）</label>
                                        <input
                                            type="text"
                                            value={inviteName}
                                            onChange={(e) => setInviteName(e.target.value)}
                                            placeholder="山田 太郎"
                                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">権限プリセット</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'viewer', label: '閲覧のみ', icon: 'visibility', desc: '閲覧権限のみ' },
                                                { id: 'editor', label: '編集者', icon: 'edit', desc: '編集可能（設定以外）' },
                                                { id: 'photographer', label: 'カメラマン', icon: 'photo_camera', desc: '撮影・納品管理' },
                                                { id: 'client', label: 'クライアント', icon: 'business', desc: '納品確認のみ' },
                                            ].map(preset => (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => setInvitePreset(preset.id)}
                                                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                        invitePreset === preset.id
                                                            ? 'border-primary bg-primary/10'
                                                            : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`material-symbols-outlined text-lg ${invitePreset === preset.id ? 'text-primary' : 'text-gray-400'}`}>
                                                            {preset.icon}
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-medium">{preset.label}</p>
                                                            <p className="text-[10px] text-gray-500">{preset.desc}</p>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!inviteEmail.trim()) {
                                                alert('メールアドレスを入力してください');
                                                return;
                                            }
                                            const result = inviteMember(inviteEmail, inviteName);
                                            if (result.success) {
                                                applyPermissionPreset(result.member.id, invitePreset);
                                                setGeneratedInviteUrl(result.inviteUrl);
                                                setShowInviteLink(true);
                                            } else {
                                                alert(result.message);
                                            }
                                        }}
                                        className="flex-1 h-12 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">link</span>
                                        招待リンクを生成
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 権限管理モーダル */}
            {showPermissionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">メンバー権限</h3>
                            <button onClick={() => setShowPermissionModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {members.length === 0 ? (
                            <div className="text-center py-8">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">group_off</span>
                                <p className="text-sm text-gray-500">まだメンバーがいません</p>
                                <button
                                    onClick={() => {
                                        setShowPermissionModal(false);
                                        setShowInviteModal(true);
                                    }}
                                    className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
                                >
                                    メンバーを招待
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {members.map(member => (
                                    <div
                                        key={member.id}
                                        className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-primary">person</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{member.name}</p>
                                                    <p className="text-[10px] text-gray-500">{member.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                    member.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                    {member.status === 'active' ? 'アクティブ' : '招待中'}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setSelectedMember(member);
                                                        setShowMemberEditModal(true);
                                                    }}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`${member.name} を削除しますか？`)) {
                                                            removeMember(member.id);
                                                        }
                                                    }}
                                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* 権限サマリー */}
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(PERMISSION_PAGES).map(([key, page]) => {
                                                const perm = member.permissions?.[key];
                                                const canView = perm?.view;
                                                const canEdit = perm?.edit;
                                                if (!canView && !canEdit) return null;
                                                return (
                                                    <span
                                                        key={key}
                                                        className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                                            canEdit
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[10px]">
                                                            {canEdit ? 'edit' : 'visibility'}
                                                        </span>
                                                        {page.label}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        {/* 招待中メンバーの再招待機能 */}
                                        {member.status === 'pending' && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                {reinviteMemberId === member.id && reinviteUrl ? (
                                                    <div className="space-y-2">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={reinviteUrl}
                                                                readOnly
                                                                className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-xs"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(reinviteUrl);
                                                                    setReinviteCopySuccess(true);
                                                                    setTimeout(() => setReinviteCopySuccess(false), 2000);
                                                                }}
                                                                className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                                                                    reinviteCopySuccess
                                                                        ? 'bg-green-500 text-white'
                                                                        : 'bg-primary text-white'
                                                                }`}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">
                                                                    {reinviteCopySuccess ? 'check' : 'content_copy'}
                                                                </span>
                                                                {reinviteCopySuccess ? 'コピー済' : 'コピー'}
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setReinviteMemberId(null);
                                                                setReinviteUrl('');
                                                            }}
                                                            className="text-xs text-gray-500 hover:text-gray-700"
                                                        >
                                                            閉じる
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            const result = generateInviteLink(member.id);
                                                            if (result) {
                                                                setReinviteMemberId(member.id);
                                                                setReinviteUrl(result.url);
                                                            }
                                                        }}
                                                        className="w-full h-9 rounded-lg border border-primary text-primary text-xs font-medium flex items-center justify-center gap-1 hover:bg-primary/5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">link</span>
                                                        招待リンクを再生成
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowPermissionModal(false)}
                            className="w-full h-12 mt-6 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

            {/* メンバー権限編集モーダル */}
            {showMemberEditModal && selectedMember && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold">{selectedMember.name}</h3>
                                <p className="text-xs text-gray-500">{selectedMember.email}</p>
                            </div>
                            <button onClick={() => setShowMemberEditModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* プリセット適用 */}
                        <div className="mb-6">
                            <label className="text-sm font-medium mb-2 block">権限プリセット</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'viewer', label: '閲覧のみ' },
                                    { id: 'editor', label: '編集者' },
                                    { id: 'photographer', label: 'カメラマン' },
                                    { id: 'client', label: 'クライアント' },
                                ].map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => applyPermissionPreset(selectedMember.id, preset.id)}
                                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 個別権限設定 */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium block">ページ別権限</label>
                            {Object.entries(PERMISSION_PAGES).map(([key, page]) => {
                                const perm = selectedMember.permissions?.[key] || { view: false, edit: false };
                                return (
                                    <div
                                        key={key}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg text-gray-400">
                                                {page.icon}
                                            </span>
                                            <span className="text-sm font-medium">{page.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    updateMemberPermissions(selectedMember.id, key, 'view', !perm.view);
                                                    if (!perm.view === false) {
                                                        updateMemberPermissions(selectedMember.id, key, 'edit', false);
                                                    }
                                                    // 更新したメンバー情報を再取得
                                                    const updated = members.find(m => m.id === selectedMember.id);
                                                    if (updated) setSelectedMember({ ...updated });
                                                }}
                                                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                                                    perm.view
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                閲覧
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newEditValue = !perm.edit;
                                                    updateMemberPermissions(selectedMember.id, key, 'edit', newEditValue);
                                                    if (newEditValue) {
                                                        updateMemberPermissions(selectedMember.id, key, 'view', true);
                                                    }
                                                    // 更新したメンバー情報を再取得
                                                    const updated = members.find(m => m.id === selectedMember.id);
                                                    if (updated) setSelectedMember({ ...updated });
                                                }}
                                                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                                                    perm.edit
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                編集
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowMemberEditModal(false)}
                            className="w-full h-12 mt-6 rounded-xl bg-primary text-white font-medium"
                        >
                            完了
                        </button>
                    </div>
                </div>
            )}

            {/* アプリについてモーダル */}
            {showAboutModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl p-6 animate-slideUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold">アプリについて</h3>
                            <button onClick={() => setShowAboutModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-white">photo_camera</span>
                            </div>
                            <h2 className="text-xl font-bold">Shooting Master</h2>
                            <p className="text-sm text-gray-500">v1.0.0</p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <p className="font-bold mb-1">主な機能</p>
                                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                    <li>• 撮影プロジェクト管理</li>
                                    <li>• AIによる完成予想図生成</li>
                                    <li>• カット指示書作成・印刷</li>
                                    <li>• モデル・小物管理</li>
                                    <li>• 納品管理・修正依頼対応</li>
                                </ul>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <p className="font-bold mb-1">使用技術</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    React + Vite + Tailwind CSS<br />
                                    Google Gemini API (画像生成)
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowAboutModal(false)}
                            className="w-full h-12 mt-6 rounded-xl bg-primary text-white font-medium"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
        </Layout>
    );
};

export default Settings;
