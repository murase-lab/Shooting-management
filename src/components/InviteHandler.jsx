import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const InviteHandler = ({ children }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { validateInviteToken, currentUser } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);

    useEffect(() => {
        const inviteToken = searchParams.get('invite');

        if (inviteToken) {
            // 招待トークンを検証
            const result = validateInviteToken(inviteToken);
            setInviteResult(result);
            setShowModal(true);

            // URLからパラメータを削除
            searchParams.delete('invite');
            setSearchParams(searchParams, { replace: true });
        }
    }, []);

    const handleClose = () => {
        setShowModal(false);
        if (inviteResult?.success) {
            navigate('/');
        }
    };

    return (
        <>
            {children}

            {/* 招待結果モーダル */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                        {inviteResult?.success ? (
                            <>
                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">招待を承認しました</h3>
                                    <p className="text-sm text-gray-500">
                                        ようこそ、{inviteResult.member?.name}さん！<br />
                                        メンバーとしてログインしました。
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                                    <p className="text-xs text-gray-500 mb-2">アクセス権限</p>
                                    <div className="space-y-1">
                                        {inviteResult.member?.permissions && Object.entries(inviteResult.member.permissions).map(([key, value]) => (
                                            value.view && (
                                                <div key={key} className="flex items-center gap-2 text-sm">
                                                    <span className="material-symbols-outlined text-xs text-green-500">check</span>
                                                    <span>{key}</span>
                                                    {value.edit && <span className="text-xs text-blue-500">(編集可)</span>}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                                        <span className="material-symbols-outlined text-3xl text-red-600">error</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">招待エラー</h3>
                                    <p className="text-sm text-gray-500">
                                        {inviteResult?.message || '招待リンクが無効です'}
                                    </p>
                                </div>
                            </>
                        )}
                        <button
                            onClick={handleClose}
                            className="w-full py-3 rounded-xl bg-primary text-white font-medium"
                        >
                            {inviteResult?.success ? 'ダッシュボードへ' : '閉じる'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InviteHandler;
