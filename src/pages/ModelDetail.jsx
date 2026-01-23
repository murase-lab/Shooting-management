import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { useModels } from '../context/ModelContext';

const ModelDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { getModelById, deleteModel, updateModel } = useModels();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const model = getModelById(id);

    // 編集用フォームデータ
    const [editData, setEditData] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [editErrors, setEditErrors] = useState({});

    const topSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const bottomSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    const openEditModal = () => {
        if (!model) return;
        setEditData({
            name: model.name || '',
            gender: model.gender || '女性',
            age: model.age || '',
            height: model.height || '',
            topSize: model.topSize || '',
            bottomSize: model.bottomSize || '',
            shoeSize: model.shoeSize || '',
            modelType: model.modelType || 'agency',
            agencyName: model.agencyName || '',
            portfolioUrl: model.portfolioUrl || '',
            instagramUrl: model.instagramUrl || '',
            memo: model.memo || '',
        });
        setEditImagePreview(model.image || null);
        setEditErrors({});
        setShowEditModal(true);
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
        if (editErrors[name]) {
            setEditErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleEditImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleEditImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setEditErrors(prev => ({ ...prev, image: '画像サイズは10MB以下にしてください' }));
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setEditErrors(prev => ({ ...prev, image: null }));
        }
    };

    const validateEditForm = () => {
        if (!editData) return false;
        const newErrors = {};
        if (!editData.name.trim()) {
            newErrors.name = '名前を入力してください';
        }
        if (editData.age && (editData.age < 1 || editData.age > 120)) {
            newErrors.age = '有効な年齢を入力してください';
        }
        if (editData.modelType === 'agency' && !editData.agencyName.trim()) {
            newErrors.agencyName = '事務所名を入力してください';
        }
        setEditErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleEditSubmit = async () => {
        if (validateEditForm() && model) {
            setIsSaving(true);
            const updatedData = {
                ...editData,
                age: editData.age ? Number(editData.age) : null,
                height: editData.height ? Number(editData.height) : null,
                image: editImagePreview,
            };

            // updateModelがawaitでクラウド保存を待つようになったので、直接呼び出す
            await updateModel(model.id, updatedData);

            setIsSaving(false);
            setShowEditModal(false);
        }
    };

    if (!model) {
        return (
            <div className="max-w-md mx-auto min-h-screen pb-32">
                <Header title="モデル詳細" />
                <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">person_off</span>
                    <p className="text-gray-500 mb-4">モデルが見つかりません</p>
                    <Link to="/model-list" className="text-primary font-bold hover:underline">
                        モデル一覧に戻る
                    </Link>
                </div>
                <BottomNav active="models" />
            </div>
        );
    }

    const handleDelete = () => {
        deleteModel(model.id);
        navigate('/model-list');
    };

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32">
            <Header title="モデル詳細" rightIcon="more_horiz" />
            <main>
                {/* Profile Header */}
                <div className="p-6 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-xl bg-gray-200 mb-4">
                        {model.image ? (
                            <img src={model.image} alt={model.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold mb-1">{model.name}</h1>
                    <p className="text-gray-500 font-medium text-sm">
                        {model.modelType === 'agency' ? model.agencyName : 'フリーランス'}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                        <span className="text-sm text-gray-400">{model.gender}</span>
                        {model.age && <span className="text-sm text-gray-400">{model.age}歳</span>}
                    </div>
                </div>

                <div className="px-6 space-y-6">
                    {/* Size Info */}
                    <section>
                        <h3 className="text-lg font-bold mb-4">サイズ詳細</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">身長</p>
                                <p className="text-lg font-bold text-primary">{model.height ? `${model.height}cm` : '-'}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">トップス</p>
                                <p className="text-lg font-bold text-primary">{model.topSize || '-'}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ボトムス</p>
                                <p className="text-lg font-bold text-primary">{model.bottomSize || '-'}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">靴</p>
                                <p className="text-lg font-bold text-primary">{model.shoeSize ? `${model.shoeSize}cm` : '-'}</p>
                            </div>
                        </div>
                    </section>

                    {/* Links */}
                    <section>
                        <h3 className="text-lg font-bold mb-4">リンク</h3>
                        <div className="space-y-3">
                            {model.instagramUrl && (
                                <a
                                    href={model.instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-pink-500">photo_camera</span>
                                    <span className="flex-1 text-sm font-medium">Instagram</span>
                                    <span className="material-symbols-outlined text-gray-400 text-xl">open_in_new</span>
                                </a>
                            )}
                            {model.portfolioUrl && (
                                <a
                                    href={model.portfolioUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-primary">language</span>
                                    <span className="flex-1 text-sm font-medium">ポートフォリオ</span>
                                    <span className="material-symbols-outlined text-gray-400 text-xl">open_in_new</span>
                                </a>
                            )}
                            {!model.instagramUrl && !model.portfolioUrl && (
                                <p className="text-sm text-gray-400 text-center py-4">リンクは登録されていません</p>
                            )}
                        </div>
                    </section>

                    {/* Memo */}
                    <section>
                        <h3 className="text-lg font-bold mb-4">メモ</h3>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            {model.memo ? (
                                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{model.memo}</p>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-2">メモはありません</p>
                            )}
                        </div>
                    </section>

                    {/* Info */}
                    <section>
                        <h3 className="text-lg font-bold mb-4">登録情報</h3>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">登録日</span>
                                <span className="text-sm font-medium">{model.createdAt}</span>
                            </div>
                        </div>
                    </section>

                    {/* Actions */}
                    <section className="pt-4 space-y-3">
                        <button
                            onClick={openEditModal}
                            className="w-full py-3 bg-primary text-white text-sm font-medium hover:bg-primary/90 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                            モデル情報を編集
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-3 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        >
                            このモデルを削除
                        </button>
                    </section>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full animate-fadeIn">
                        <h3 className="text-lg font-bold mb-2">モデルを削除しますか？</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            「{model.name}」を削除します。この操作は取り消せません。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editData && (
                <>
                    {/* 背景オーバーレイ */}
                    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowEditModal(false)} />

                    {/* モーダルコンテンツ（スクロール可能） */}
                    <div className="fixed inset-x-0 top-0 bottom-20 z-50 overflow-y-auto">
                        <div className="min-h-full flex items-end justify-center">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl">
                                {/* ヘッダー */}
                                <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700 rounded-t-3xl z-10">
                                    <h3 className="text-lg font-bold">モデル情報を編集</h3>
                                    <button onClick={() => setShowEditModal(false)}>
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>

                                {/* フォームコンテンツ */}
                                <div className="p-6 pt-4 space-y-5">
                                    {/* Profile Image */}
                                    <div className="text-center">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditImageChange}
                                            className="hidden"
                                        />
                                        <button
                                            onClick={handleEditImageClick}
                                            className="w-24 h-24 mx-auto rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                                        >
                                            {editImagePreview ? (
                                                <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-3xl text-gray-400">add_a_photo</span>
                                            )}
                                        </button>
                                        {editErrors.image && <p className="text-red-500 text-xs mt-2">{editErrors.image}</p>}
                                    </div>

                                    {/* Basic Info */}
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-medium">名前 <span className="text-red-500">*</span></label>
                                            <input
                                                name="name"
                                                value={editData.name}
                                                onChange={handleEditInputChange}
                                                className={`w-full rounded-xl border h-11 px-4 bg-white dark:bg-gray-900 ${
                                                    editErrors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                                placeholder="例：田中 太郎"
                                            />
                                            {editErrors.name && <p className="text-red-500 text-xs">{editErrors.name}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-sm font-medium">性別</label>
                                                <select
                                                    name="gender"
                                                    value={editData.gender}
                                                    onChange={handleEditInputChange}
                                                    className="w-full h-11 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4"
                                                >
                                                    <option value="女性">女性</option>
                                                    <option value="男性">男性</option>
                                                    <option value="その他">その他</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-sm font-medium">年齢</label>
                                                <input
                                                    name="age"
                                                    value={editData.age}
                                                    onChange={handleEditInputChange}
                                                    className={`w-full h-11 rounded-xl bg-white dark:bg-gray-900 border px-4 ${
                                                        editErrors.age ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                />
                                                {editErrors.age && <p className="text-red-500 text-xs">{editErrors.age}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Size Info */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-500">サイズ情報</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-gray-500">身長(cm)</label>
                                                <input
                                                    name="height"
                                                    value={editData.height}
                                                    onChange={handleEditInputChange}
                                                    className="w-full h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 text-sm"
                                                    type="number"
                                                    placeholder="165"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-gray-500">トップス</label>
                                                <select
                                                    name="topSize"
                                                    value={editData.topSize}
                                                    onChange={handleEditInputChange}
                                                    className="w-full h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 text-sm"
                                                >
                                                    <option value="">-</option>
                                                    {topSizes.map(size => (
                                                        <option key={size} value={size}>{size}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-gray-500">ボトムス</label>
                                                <select
                                                    name="bottomSize"
                                                    value={editData.bottomSize}
                                                    onChange={handleEditInputChange}
                                                    className="w-full h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 text-sm"
                                                >
                                                    <option value="">-</option>
                                                    {bottomSizes.map(size => (
                                                        <option key={size} value={size}>{size}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-gray-500">靴(cm)</label>
                                                <input
                                                    name="shoeSize"
                                                    value={editData.shoeSize}
                                                    onChange={handleEditInputChange}
                                                    className="w-full h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 text-sm"
                                                    type="number"
                                                    step="0.5"
                                                    placeholder="25.5"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Affiliation */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-500">所属</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setEditData(prev => ({ ...prev, modelType: 'agency' }))}
                                                className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                                                    editData.modelType === 'agency'
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                事務所所属
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditData(prev => ({ ...prev, modelType: 'freelance' }))}
                                                className={`flex-1 h-10 rounded-lg text-sm font-medium transition-all ${
                                                    editData.modelType === 'freelance'
                                                        ? 'bg-primary text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                }`}
                                            >
                                                フリーランス
                                            </button>
                                        </div>

                                        {editData.modelType === 'agency' && (
                                            <div className="flex flex-col gap-1">
                                                <label className="text-sm font-medium">事務所名 <span className="text-red-500">*</span></label>
                                                <input
                                                    name="agencyName"
                                                    value={editData.agencyName}
                                                    onChange={handleEditInputChange}
                                                    className={`w-full rounded-xl border h-11 px-4 bg-white dark:bg-gray-900 ${
                                                        editErrors.agencyName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                    }`}
                                                    placeholder="例：Elite Model Management"
                                                />
                                                {editErrors.agencyName && <p className="text-red-500 text-xs">{editErrors.agencyName}</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Links */}
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-500">リンク</p>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-pink-500 text-sm">photo_camera</span>
                                                Instagram URL
                                            </label>
                                            <input
                                                name="instagramUrl"
                                                value={editData.instagramUrl}
                                                onChange={handleEditInputChange}
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 h-11 px-4 bg-white dark:bg-gray-900"
                                                placeholder="https://instagram.com/username"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-primary text-sm">language</span>
                                                ポートフォリオURL
                                            </label>
                                            <input
                                                name="portfolioUrl"
                                                value={editData.portfolioUrl}
                                                onChange={handleEditInputChange}
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 h-11 px-4 bg-white dark:bg-gray-900"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    {/* Memo */}
                                    <div className="space-y-2 pb-4">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <span className="material-symbols-outlined text-amber-500 text-lg">sticky_note_2</span>
                                            メモ
                                        </label>
                                        <textarea
                                            name="memo"
                                            value={editData.memo}
                                            onChange={handleEditInputChange}
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 min-h-[100px] resize-none"
                                            placeholder="連絡先、注意事項、過去の撮影情報など..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 固定フッター（ボタン） - 画面最下部に固定 */}
                    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-[60]">
                        <div className="flex gap-3 max-w-md mx-auto">
                            <button
                                onClick={() => setShowEditModal(false)}
                                disabled={isSaving}
                                className="flex-1 h-12 rounded-xl border border-gray-200 dark:border-gray-700 font-medium bg-white dark:bg-gray-800 disabled:opacity-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                disabled={isSaving}
                                className="flex-1 h-12 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                                ) : (
                                    <span className="material-symbols-outlined text-lg">save</span>
                                )}
                                {isSaving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </footer>
                </>
            )}

            <BottomNav active="models" />
        </div>
    );
};

export default ModelDetail;
