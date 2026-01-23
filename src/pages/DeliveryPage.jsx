import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';

const DELIVERY_STATUS = {
    pending: { label: '未納品', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: 'schedule' },
    uploaded: { label: '納品済', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', icon: 'cloud_upload' },
    approved: { label: '確認済', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', icon: 'check_circle' },
    revision_requested: { label: '修正依頼', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400', icon: 'edit_note' },
};

const DeliveryPage = () => {
    const { projectId } = useParams();
    const {
        projects,
        getProjectById,
        setProductDriveUrl,
        approveDelivery,
        addRevisionRequest,
        resolveRevision,
        getDeliveryProgress,
        getCutsUsingProp,
    } = useProjects();

    const [selectedProject, setSelectedProject] = useState(projectId || (projects[0]?.id || null));
    const [viewMode, setViewMode] = useState('photographer'); // 'photographer' or 'client'
    const [showRevisionModal, setShowRevisionModal] = useState(null); // product id
    const [showDriveModal, setShowDriveModal] = useState(null); // product id
    const [revisionMessage, setRevisionMessage] = useState('');
    const [driveUrl, setDriveUrl] = useState('');

    const project = getProjectById(selectedProject);
    const products = useMemo(() => {
        if (!project) return [];
        return (project.props || []).filter(p => p.category === 'product');
    }, [project]);

    const deliveryProgress = getDeliveryProgress(selectedProject);

    const handleSetDriveUrl = () => {
        if (!driveUrl.trim() || !showDriveModal) return;
        setProductDriveUrl(selectedProject, showDriveModal, driveUrl);
        setShowDriveModal(null);
        setDriveUrl('');
    };

    const handleAddRevision = () => {
        if (!revisionMessage.trim() || !showRevisionModal) return;
        addRevisionRequest(selectedProject, showRevisionModal, revisionMessage);
        setShowRevisionModal(null);
        setRevisionMessage('');
    };

    const openDriveFolder = (url) => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    if (!project) {
        return (
            <Layout activeNav="delivery">
            <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8 bg-background-light dark:bg-background-dark">
                <Header title="納品管理" showBack={false} />
                <div className="p-6 lg:p-6 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">folder_off</span>
                    <p className="text-gray-500 mb-4">プロジェクトを選択してください</p>
                </div>
            </div>
            </Layout>
        );
    }

    return (
        <Layout activeNav="delivery">
        <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8 bg-background-light dark:bg-background-dark">
            <Header title="納品管理" showBack={false} />

            <main className="p-4 lg:p-6 space-y-4">
                {/* Project Selector */}
                <div>
                    <label className="text-xs text-gray-500 mb-1 block">プロジェクト選択</label>
                    <select
                        value={selectedProject || ''}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                    >
                        {projects.length === 0 ? (
                            <option value="">プロジェクトがありません</option>
                        ) : (
                            projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))
                        )}
                    </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                    <button
                        onClick={() => setViewMode('photographer')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            viewMode === 'photographer'
                                ? 'bg-white dark:bg-gray-700 shadow-sm'
                                : 'text-gray-500'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">photo_camera</span>
                        カメラマン
                    </button>
                    <button
                        onClick={() => setViewMode('client')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            viewMode === 'client'
                                ? 'bg-white dark:bg-gray-700 shadow-sm'
                                : 'text-gray-500'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">business</span>
                        クライアント
                    </button>
                </div>

                {/* Progress Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-bold mb-3">納品進捗</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <p className="text-lg font-bold text-gray-600 dark:text-gray-300">{deliveryProgress.pending}</p>
                            <p className="text-[10px] text-gray-400">未納品</p>
                        </div>
                        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-lg font-bold text-blue-600">{deliveryProgress.uploaded}</p>
                            <p className="text-[10px] text-blue-500">納品済</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-lg font-bold text-green-600">{deliveryProgress.approved}</p>
                            <p className="text-[10px] text-green-500">確認済</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-lg font-bold text-red-600">{deliveryProgress.revisionRequested}</p>
                            <p className="text-[10px] text-red-500">修正依頼</p>
                        </div>
                    </div>
                    {deliveryProgress.total > 0 && (
                        <div className="mt-3">
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-green-500 transition-all"
                                    style={{ width: `${(deliveryProgress.approved / deliveryProgress.total) * 100}%` }}
                                />
                                <div
                                    className="bg-blue-500 transition-all"
                                    style={{ width: `${(deliveryProgress.uploaded / deliveryProgress.total) * 100}%` }}
                                />
                                <div
                                    className="bg-red-500 transition-all"
                                    style={{ width: `${(deliveryProgress.revisionRequested / deliveryProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Products List */}
                <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                        商品別納品状況
                    </h3>

                    {products.length > 0 ? (
                        <div className="space-y-3">
                            {products.map((product, idx) => {
                                const status = product.delivery?.status || 'pending';
                                const statusInfo = DELIVERY_STATUS[status];
                                const cutsCount = getCutsUsingProp(selectedProject, product.id).length;
                                const revisions = product.delivery?.revisions || [];
                                const unresolvedRevisions = revisions.filter(r => !r.resolvedAt);

                                return (
                                    <div
                                        key={product.id}
                                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                                    >
                                        {/* Product Header */}
                                        <div className="p-4">
                                            <div className="flex gap-3">
                                                {/* Thumbnail */}
                                                <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                    {product.image ? (
                                                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-2xl text-gray-400">inventory_2</span>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-bold text-blue-500">商品{idx + 1}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusInfo.color}`}>
                                                            <span className="material-symbols-outlined text-xs">{statusInfo.icon}</span>
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-bold truncate">{product.name}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{cutsCount}カット撮影</p>
                                                </div>
                                            </div>

                                            {/* Drive URL */}
                                            {product.driveUrl ? (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <button
                                                        onClick={() => openDriveFolder(product.driveUrl)}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg text-amber-500">folder</span>
                                                        <span className="flex-1 truncate text-gray-600 dark:text-gray-300">Googleドライブを開く</span>
                                                        <span className="material-symbols-outlined text-gray-400 text-lg">open_in_new</span>
                                                    </button>
                                                    {/* クライアントモードのみ編集ボタンを表示 */}
                                                    {viewMode === 'client' && (
                                                        <button
                                                            onClick={() => {
                                                                setDriveUrl(product.driveUrl || '');
                                                                setShowDriveModal(product.id);
                                                            }}
                                                            className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                            title="URLを編集"
                                                        >
                                                            <span className="material-symbols-outlined text-lg text-gray-500">edit</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ) : viewMode === 'client' ? (
                                                <button
                                                    onClick={() => {
                                                        setDriveUrl(product.driveUrl || '');
                                                        setShowDriveModal(product.id);
                                                    }}
                                                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-400 hover:border-primary hover:text-primary transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">add_link</span>
                                                    ドライブフォルダを設定
                                                </button>
                                            ) : (
                                                <div className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-400">
                                                    <span className="material-symbols-outlined text-lg">link_off</span>
                                                    ドライブ未設定
                                                </div>
                                            )}

                                            {/* Revisions */}
                                            {revisions.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <p className="text-[10px] text-gray-400">修正指示 ({unresolvedRevisions.length}件未対応)</p>
                                                    {revisions.map(rev => (
                                                        <div
                                                            key={rev.id}
                                                            className={`p-2 rounded-lg text-xs ${
                                                                rev.resolvedAt
                                                                    ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 line-through'
                                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="flex-1">{rev.message}</p>
                                                                {!rev.resolvedAt && viewMode === 'photographer' && (
                                                                    <button
                                                                        onClick={() => resolveRevision(selectedProject, product.id, rev.id)}
                                                                        className="text-[10px] text-green-600 font-medium shrink-0"
                                                                    >
                                                                        対応済み
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex border-t border-gray-100 dark:border-gray-700">
                                            {viewMode === 'photographer' ? (
                                                product.driveUrl ? (
                                                    <button
                                                        onClick={() => openDriveFolder(product.driveUrl)}
                                                        className="flex-1 py-3 text-center text-xs font-medium text-amber-600 flex items-center justify-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">folder_open</span>
                                                        ドライブにアップロード
                                                    </button>
                                                ) : (
                                                    <div className="flex-1 py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                                                        ドライブ設定待ち
                                                    </div>
                                                )
                                            ) : (
                                                <>
                                                    {status === 'uploaded' || status === 'revision_requested' ? (
                                                        <>
                                                            <button
                                                                onClick={() => approveDelivery(selectedProject, product.id)}
                                                                className="flex-1 py-3 text-center text-xs font-medium text-green-600 flex items-center justify-center gap-1 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                                確認OK
                                                            </button>
                                                            <button
                                                                onClick={() => setShowRevisionModal(product.id)}
                                                                className="flex-1 py-3 text-center text-xs font-medium text-red-500 flex items-center justify-center gap-1 hover:bg-red-50 dark:hover:bg-red-900/20 border-l border-gray-100 dark:border-gray-700 transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">edit_note</span>
                                                                修正指示
                                                            </button>
                                                        </>
                                                    ) : status === 'approved' ? (
                                                        <div className="flex-1 py-3 text-center text-xs text-green-600 flex items-center justify-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">verified</span>
                                                            確認完了
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                                                            <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                                                            納品待ち
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inventory_2</span>
                            <p className="text-sm text-gray-400 mb-4">撮影商品がありません</p>
                            <Link
                                to={`/prop-checklist/${selectedProject}`}
                                className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                商品を追加
                            </Link>
                        </div>
                    )}
                </div>
            </main>

            {/* Drive URL Modal */}
            {showDriveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold mb-2">Googleドライブを設定</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            この商品の撮影データを保存するGoogleドライブフォルダのURLを入力してください。
                        </p>
                        <input
                            type="url"
                            value={driveUrl}
                            onChange={(e) => setDriveUrl(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4 mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDriveModal(null);
                                    setDriveUrl('');
                                }}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSetDriveUrl}
                                disabled={!driveUrl.trim()}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
                            >
                                設定
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revision Modal */}
            {showRevisionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold mb-2">修正指示を追加</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            カメラマンへの修正指示を入力してください。
                        </p>
                        <textarea
                            value={revisionMessage}
                            onChange={(e) => setRevisionMessage(e.target.value)}
                            placeholder="修正内容を具体的に記載..."
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 min-h-[100px] resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRevisionModal(null);
                                    setRevisionMessage('');
                                }}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleAddRevision}
                                disabled={!revisionMessage.trim()}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                            >
                                送信
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
        </Layout>
    );
};

export default DeliveryPage;
