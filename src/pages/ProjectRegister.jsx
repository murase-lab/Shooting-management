import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useProjects } from '../context/ProjectContext';
import { readAndResizeImage } from '../utils/imageUtils';
import { ensureImageSize } from '../utils/imageCompressor';

const ProjectRegister = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const isEditMode = !!editId;

    const fileInputRef = useRef(null);
    const { addProject, updateProject, getProjectById } = useProjects();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        shootingDate: '',
        category: 'cosmetics', // cosmetics, apparel, food, other
    });

    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [existingProject, setExistingProject] = useState(null);

    // 編集モードの場合、既存データを読み込み
    useEffect(() => {
        if (isEditMode && editId) {
            const project = getProjectById(editId);
            if (project) {
                setExistingProject(project);
                setFormData({
                    name: project.name || '',
                    description: project.description || '',
                    shootingDate: project.shootingDate || '',
                    category: project.category || 'cosmetics',
                });
                if (project.productImage) {
                    setImagePreview(project.productImage);
                }
            } else {
                // プロジェクトが見つからない場合は新規作成モードに
                navigate('/project-register', { replace: true });
            }
        }
    }, [isEditMode, editId, getProjectById, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, image: '画像サイズは10MB以下にしてください' }));
                return;
            }
            setProductImage(file);
            setErrors(prev => ({ ...prev, image: null }));
            try {
                // 画像をリサイズして保存（localStorage容量対策）
                const resizedImage = await readAndResizeImage(file, {
                    maxWidth: 800,
                    maxHeight: 800,
                    quality: 0.7
                });
                // さらに100KB以下に圧縮
                const compressedImage = await ensureImageSize(resizedImage, 100);
                setImagePreview(compressedImage);
            } catch (error) {
                console.error('画像のリサイズに失敗:', error);
                setErrors(prev => ({ ...prev, image: '画像の処理に失敗しました' }));
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'プロジェクト名を入力してください';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (validateForm()) {
            if (isEditMode && existingProject) {
                // 編集モード
                await updateProject(existingProject.id, {
                    ...formData,
                    productImage: imagePreview || existingProject.productImage,
                });
                setTimeout(() => {
                    navigate(`/project-detail/${existingProject.id}`);
                }, 0);
            } else {
                // 新規作成モード
                const newProject = await addProject({
                    ...formData,
                    productImage: imagePreview,
                });
                setTimeout(() => {
                    navigate(`/project-detail/${newProject.id}`);
                }, 0);
            }
        }
    };

    const categories = [
        { id: 'cosmetics', label: 'コスメ・美容', icon: 'spa' },
        { id: 'apparel', label: 'アパレル', icon: 'checkroom' },
        { id: 'food', label: '食品・飲料', icon: 'restaurant' },
        { id: 'other', label: 'その他', icon: 'category' },
    ];

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32">
            <Header title={isEditMode ? 'プロジェクト編集' : '新規プロジェクト作成'} />
            <main className="p-6 space-y-6">
                {/* Product Image */}
                <section>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">商品画像</h3>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                    <button
                        onClick={handleImageClick}
                        className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all ${
                            imagePreview
                                ? 'border-primary'
                                : 'border-slate-300 bg-slate-100 dark:bg-surface-dark hover:border-primary hover:bg-slate-50 dark:hover:bg-surface-dark/80'
                        }`}
                    >
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">add_photo_alternate</span>
                                <p className="text-sm text-slate-500">商品画像をアップロード</p>
                                <p className="text-xs text-slate-400 mt-1">タップして写真を選択または撮影</p>
                            </>
                        )}
                    </button>
                    {errors.image && <p className="text-red-500 text-xs mt-2">{errors.image}</p>}
                    {imagePreview && (
                        <button
                            onClick={() => { setProductImage(null); setImagePreview(null); }}
                            className="mt-2 text-xs text-red-500 hover:underline"
                        >
                            画像を削除
                        </button>
                    )}
                </section>

                {/* Basic Info */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">プロジェクト情報</h3>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">プロジェクト名 <span className="text-red-500">*</span></label>
                        <input
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`w-full rounded-xl border bg-white dark:bg-surface-dark h-12 px-4 ${
                                errors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            placeholder="例：サマー・スキンケア 2024"
                            type="text"
                        />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">説明</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 min-h-[100px] resize-none"
                            placeholder="プロジェクトの概要や目的を入力..."
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">撮影予定日</label>
                        <input
                            name="shootingDate"
                            value={formData.shootingDate}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                            type="date"
                        />
                    </div>
                </section>

                {/* Category */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">カテゴリ</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                    formData.category === cat.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <span className={`material-symbols-outlined ${formData.category === cat.id ? 'text-primary' : 'text-slate-400'}`}>
                                    {cat.icon}
                                </span>
                                <span className={`text-sm font-medium ${formData.category === cat.id ? 'text-primary' : ''}`}>
                                    {cat.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Tips */}
                {!isEditMode && (
                    <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-blue-500">lightbulb</span>
                            <div>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">ヒント</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    プロジェクト作成後、カット指示を追加してAIで完成イメージを生成できます。
                                </p>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 z-50">
                <button
                    onClick={handleSubmit}
                    className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-primary/90 transition-colors"
                >
                    <span className="material-symbols-outlined">{isEditMode ? 'save' : 'add'}</span>
                    {isEditMode ? 'プロジェクトを更新' : 'プロジェクトを作成'}
                </button>
            </footer>
        </div>
    );
};

export default ProjectRegister;
