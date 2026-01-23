import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useModels } from '../context/ModelContext';
import { ensureImageSize } from '../utils/imageCompressor';

const ModelRegister = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { addModel } = useModels();

    const [formData, setFormData] = useState({
        name: '',
        gender: '女性',
        age: '',
        height: '',
        topSize: '',
        bottomSize: '',
        shoeSize: '',
        modelType: 'agency', // 'agency' or 'freelance'
        agencyName: '',
        portfolioUrl: '',
        instagramUrl: '',
        memo: '',
    });

    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, image: '画像サイズは10MB以下にしてください' }));
                return;
            }
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setErrors(prev => ({ ...prev, image: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = '名前を入力してください';
        }
        if (!formData.age || formData.age < 1 || formData.age > 120) {
            newErrors.age = '有効な年齢を入力してください';
        }
        if (formData.modelType === 'agency' && !formData.agencyName.trim()) {
            newErrors.agencyName = '事務所名を入力してください';
        }
        if (formData.instagramUrl && !formData.instagramUrl.includes('instagram.com')) {
            newErrors.instagramUrl = '有効なInstagram URLを入力してください';
        }
        if (formData.portfolioUrl && !formData.portfolioUrl.startsWith('http')) {
            newErrors.portfolioUrl = '有効なURLを入力してください';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        // 二重送信防止
        if (isSubmitting) return;

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                // 画像を圧縮（100KB以下に）
                const compressedImage = await ensureImageSize(imagePreview, 100);

                const newModel = await addModel({
                    ...formData,
                    age: Number(formData.age),
                    height: formData.height ? Number(formData.height) : null,
                    image: compressedImage,
                });

                // ページ遷移
                navigate(`/model-detail/${newModel.id}`);
            } catch (error) {
                console.error('モデル登録エラー:', error);
                alert('エラー: ' + error.message);
                setIsSubmitting(false);
            }
        }
    };

    const topSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const bottomSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32">
            <Header title="モデル新規登録" />
            <main className="p-6 space-y-6">
                {/* Profile Image */}
                <div className="text-center">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                    <button
                        onClick={handleImageClick}
                        className={`w-40 h-52 mx-auto rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${
                            imagePreview
                                ? 'border-primary'
                                : 'border-slate-400 bg-slate-200 dark:bg-surface-dark hover:border-primary hover:bg-slate-100 dark:hover:bg-surface-dark/80'
                        }`}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-4xl text-slate-400">add_a_photo</span>
                                <p className="text-xs text-slate-500 mt-2">プロフィール写真を追加</p>
                            </>
                        )}
                    </button>
                    {errors.image && <p className="text-red-500 text-xs mt-2">{errors.image}</p>}
                    {imagePreview && (
                        <button
                            onClick={() => { setProfileImage(null); setImagePreview(null); }}
                            className="mt-2 text-xs text-red-500 hover:underline"
                        >
                            画像を削除
                        </button>
                    )}
                </div>

                {/* Basic Info */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">基本情報</h3>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">名前 <span className="text-red-500">*</span></label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`w-full rounded-lg border bg-white dark:bg-surface-dark h-12 px-4 ${
                                errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            placeholder="例：田中 太郎"
                            type="text"
                        />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">性別</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 px-4"
                            >
                                <option value="女性">女性</option>
                                <option value="男性">男性</option>
                                <option value="その他">その他</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">年齢 <span className="text-red-500">*</span></label>
                            <input
                                name="age"
                                value={formData.age}
                                onChange={handleInputChange}
                                className={`w-full h-12 rounded-lg bg-white dark:bg-surface-dark px-4 ${
                                    errors.age ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                                }`}
                                type="number"
                                min="1"
                                max="120"
                                placeholder="25"
                            />
                            {errors.age && <p className="text-red-500 text-xs">{errors.age}</p>}
                        </div>
                    </div>
                </section>

                {/* Size Info */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">サイズ情報</h3>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">身長 (cm)</label>
                        <input
                            name="height"
                            value={formData.height}
                            onChange={handleInputChange}
                            className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 px-4"
                            type="number"
                            min="100"
                            max="250"
                            placeholder="165"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">トップス</label>
                            <select
                                name="topSize"
                                value={formData.topSize}
                                onChange={handleInputChange}
                                className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 px-4"
                            >
                                <option value="">選択</option>
                                {topSizes.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">ボトムス</label>
                            <select
                                name="bottomSize"
                                value={formData.bottomSize}
                                onChange={handleInputChange}
                                className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 px-4"
                            >
                                <option value="">選択</option>
                                {bottomSizes.map(size => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">靴のサイズ (cm)</label>
                        <input
                            name="shoeSize"
                            value={formData.shoeSize}
                            onChange={handleInputChange}
                            className="w-full h-12 rounded-lg bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 px-4"
                            type="number"
                            step="0.5"
                            min="20"
                            max="35"
                            placeholder="25.5"
                        />
                    </div>
                </section>

                {/* Affiliation */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">所属</h3>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, modelType: 'agency' }))}
                            className={`flex-1 h-12 rounded-lg font-medium transition-all ${
                                formData.modelType === 'agency'
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            事務所所属
                        </button>
                        <button
                            onClick={() => setFormData(prev => ({ ...prev, modelType: 'freelance' }))}
                            className={`flex-1 h-12 rounded-lg font-medium transition-all ${
                                formData.modelType === 'freelance'
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            フリーランス
                        </button>
                    </div>

                    {formData.modelType === 'agency' && (
                        <div className="flex flex-col gap-1.5 animate-fadeIn">
                            <label className="text-sm font-medium">事務所名 <span className="text-red-500">*</span></label>
                            <input
                                name="agencyName"
                                value={formData.agencyName}
                                onChange={handleInputChange}
                                className={`w-full rounded-lg bg-white dark:bg-surface-dark h-12 px-4 ${
                                    errors.agencyName ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                                }`}
                                placeholder="例：Elite Model Management"
                                type="text"
                            />
                            {errors.agencyName && <p className="text-red-500 text-xs">{errors.agencyName}</p>}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">language</span>
                            ポートフォリオURL
                        </label>
                        <input
                            name="portfolioUrl"
                            value={formData.portfolioUrl}
                            onChange={handleInputChange}
                            className={`w-full rounded-lg bg-white dark:bg-surface-dark h-12 px-4 ${
                                errors.portfolioUrl ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            placeholder="https://..."
                            type="url"
                        />
                        {errors.portfolioUrl && <p className="text-red-500 text-xs">{errors.portfolioUrl}</p>}
                    </div>
                </section>

                {/* SNS */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">SNS</h3>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-pink-500 text-lg">photo_camera</span>
                            Instagram URL
                        </label>
                        <input
                            name="instagramUrl"
                            value={formData.instagramUrl}
                            onChange={handleInputChange}
                            className={`w-full rounded-lg bg-white dark:bg-surface-dark h-12 px-4 ${
                                errors.instagramUrl ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            placeholder="https://instagram.com/username"
                            type="url"
                        />
                        {errors.instagramUrl && <p className="text-red-500 text-xs">{errors.instagramUrl}</p>}
                    </div>
                </section>

                {/* Memo */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">メモ</h3>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500 text-lg">sticky_note_2</span>
                            備考・連絡先など
                        </label>
                        <textarea
                            name="memo"
                            value={formData.memo}
                            onChange={handleInputChange}
                            className="w-full rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 p-4 min-h-[100px] resize-none"
                            placeholder="連絡先、注意事項、過去の撮影情報など..."
                        />
                    </div>
                </section>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 z-50">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full max-w-md mx-auto block bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                            登録中...
                        </>
                    ) : (
                        'モデルを登録'
                    )}
                </button>
            </footer>
        </div>
    );
};

export default ModelRegister;
