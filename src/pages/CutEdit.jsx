import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useProjects } from '../context/ProjectContext';
import { useModels } from '../context/ModelContext';
import { generateImage, buildImagePrompt } from '../services/aiImageService';

const CutEdit = () => {
    const { projectId, cutId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const aiInputRef = useRef(null);
    const { getProjectById, getCutById, updateCut } = useProjects();
    const { models } = useModels();

    const project = getProjectById(projectId);
    const cut = getCutById(projectId, cutId);

    const [formData, setFormData] = useState({
        title: '',
        scene: '',
        description: '',
        angle: '',
        lighting: '',
        comments: '',
    });

    const [originalImage, setOriginalImage] = useState(null);
    const [aiGeneratedImage, setAiGeneratedImage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [selectedPropIds, setSelectedPropIds] = useState([]);
    const [selectedModelIds, setSelectedModelIds] = useState([]);
    const [errors, setErrors] = useState({});
    const [isInitialized, setIsInitialized] = useState(false);

    // カットデータが利用可能になったらフォームを初期化
    useEffect(() => {
        if (cut && !isInitialized) {
            setFormData({
                title: cut.title || '',
                scene: cut.scene || '',
                description: cut.description || '',
                angle: cut.angle || '',
                lighting: cut.lighting || '',
                comments: cut.comments || '',
            });
            setOriginalImage(cut.originalImage || null);
            setAiGeneratedImage(cut.aiGeneratedImage || null);
            setSelectedPropIds(cut.propIds || []);
            setSelectedModelIds(cut.modelIds || []);
            setIsInitialized(true);
        }
    }, [cut, isInitialized]);

    const projectProps = project?.props || [];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleOriginalImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleAiImageClick = () => {
        aiInputRef.current?.click();
    };

    const handleOriginalImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, originalImage: '画像サイズは10MB以下にしてください' }));
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setOriginalImage(reader.result);
            };
            reader.readAsDataURL(file);
            setErrors(prev => ({ ...prev, originalImage: null }));
        }
    };

    const handleAiImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, aiImage: '画像サイズは10MB以下にしてください' }));
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAiGeneratedImage(reader.result);
            };
            reader.readAsDataURL(file);
            setErrors(prev => ({ ...prev, aiImage: null }));
        }
    };

    // AI画像生成（NanoBanana Pro / Gemini）
    const handleGenerateAI = async () => {
        // プロンプトが空の場合は自動生成
        let prompt = aiPrompt.trim();
        if (!prompt) {
            // 選択された商品情報を取得
            const selectedProduct = projectProps.find(p =>
                p.category === 'product' && selectedPropIds.includes(p.id)
            );
            prompt = buildImagePrompt(formData, selectedProduct);
        }

        if (!prompt) {
            setErrors(prev => ({ ...prev, ai: 'プロンプトを入力するか、カット情報を入力してください' }));
            return;
        }

        setIsGenerating(true);
        setErrors(prev => ({ ...prev, ai: null }));

        try {
            // 元画像があれば参照画像として使用
            const result = await generateImage(prompt, originalImage);

            if (result.success && result.imageUrl) {
                setAiGeneratedImage(result.imageUrl);
            } else {
                throw new Error('画像の生成に失敗しました');
            }
        } catch (error) {
            console.error('AI Generation Error:', error);
            setErrors(prev => ({ ...prev, ai: error.message || 'AI生成に失敗しました。再試行してください。' }));
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePropSelection = (propId) => {
        setSelectedPropIds(prev =>
            prev.includes(propId)
                ? prev.filter(id => id !== propId)
                : [...prev, propId]
        );
    };

    const toggleModelSelection = (modelId) => {
        setSelectedModelIds(prev =>
            prev.includes(modelId)
                ? prev.filter(id => id !== modelId)
                : [...prev, modelId]
        );
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'カットタイトルを入力してください';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (validateForm()) {
            await updateCut(projectId, Number(cutId), {
                ...formData,
                originalImage: originalImage,
                aiGeneratedImage: aiGeneratedImage,
                propIds: selectedPropIds,
                modelIds: selectedModelIds,
            });
            // 状態更新を確実に反映させるため、次のイベントループで遷移
            setTimeout(() => {
                navigate(`/project-detail/${projectId}`);
            }, 0);
        }
    };

    const angles = ['正面', '斜め45度', '俯瞰', 'ローアングル', 'マクロ', 'ワイド'];
    const lightings = ['自然光', 'ソフトライト', 'サイドライト', 'バックライト', 'スタジオライト', 'ドラマチック'];

    if (!project || !cut) {
        return (
            <div className="max-w-md mx-auto min-h-screen pb-32">
                <Header title="カット編集" />
                <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">photo_library</span>
                    <p className="text-gray-500 mb-4">カットが見つかりません</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-primary font-bold hover:underline"
                    >
                        戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32 bg-background-light dark:bg-background-dark">
            <Header title="カット編集" subtitle={project.name} />

            <main className="p-6 space-y-6">
                {/* Image Preview */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">画像</h3>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Original Image */}
                        <div className="space-y-2">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">元画像</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleOriginalImageChange}
                                className="hidden"
                            />
                            <button
                                onClick={handleOriginalImageClick}
                                className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary transition-colors"
                            >
                                {originalImage ? (
                                    <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-gray-400">add_photo_alternate</span>
                                        <span className="text-xs text-gray-400 mt-1">タップして選択</span>
                                    </div>
                                )}
                            </button>
                            {errors.originalImage && <p className="text-red-500 text-xs">{errors.originalImage}</p>}
                        </div>

                        {/* AI Generated Image */}
                        <div className="space-y-2">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">AI生成</p>
                            <input
                                ref={aiInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAiImageChange}
                                className="hidden"
                            />
                            <button
                                onClick={handleAiImageClick}
                                className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary transition-colors"
                            >
                                {aiGeneratedImage ? (
                                    <img src={aiGeneratedImage} alt="AI Generated" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-gray-400">auto_awesome</span>
                                        <span className="text-xs text-gray-400 mt-1">タップして選択</span>
                                    </div>
                                )}
                            </button>
                            {errors.aiImage && <p className="text-red-500 text-xs">{errors.aiImage}</p>}
                        </div>
                    </div>

                    {/* AI Generation */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                        <p className="text-sm font-medium">AIで画像を生成</p>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-3 text-sm min-h-[80px] resize-none"
                            placeholder="生成プロンプトを入力..."
                        />
                        {errors.ai && <p className="text-red-500 text-xs">{errors.ai}</p>}
                        <button
                            onClick={handleGenerateAI}
                            disabled={isGenerating}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <>
                                    <span className="animate-spin material-symbols-outlined text-lg">progress_activity</span>
                                    生成中...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                                    AIで生成
                                </>
                            )}
                        </button>
                    </div>
                </section>

                {/* Form */}
                <section className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">カット詳細</h3>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">カットタイトル <span className="text-red-500">*</span></label>
                        <input
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className={`w-full rounded-xl border bg-white dark:bg-surface-dark h-12 px-4 ${
                                errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            placeholder="例：俯瞰：泡のディテール"
                        />
                        {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">シーン</label>
                            <input
                                name="scene"
                                value={formData.scene}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                                placeholder="Scene A"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium">アングル</label>
                            <select
                                name="angle"
                                value={formData.angle}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                            >
                                <option value="">選択</option>
                                {angles.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">ライティング</label>
                        <select
                            name="lighting"
                            value={formData.lighting}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                        >
                            <option value="">選択</option>
                            {lightings.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">撮影メモ・指示</label>
                        <textarea
                            name="comments"
                            value={formData.comments}
                            onChange={handleInputChange}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 min-h-[120px] resize-none"
                            placeholder="カメラマンへの詳細な指示やメモを入力..."
                        />
                    </div>

                    {/* 使用する小物・商品 */}
                    {projectProps.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">inventory_2</span>
                                使用する小物・商品
                            </label>
                            <p className="text-xs text-gray-500 -mt-1">このカットで使用するアイテムを選択</p>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {projectProps.map(prop => (
                                    <button
                                        key={prop.id}
                                        type="button"
                                        onClick={() => togglePropSelection(prop.id)}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                                            selectedPropIds.includes(prop.id)
                                                ? 'border-primary bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`size-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                selectedPropIds.includes(prop.id)
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'border-gray-300'
                                            }`}>
                                                {selectedPropIds.includes(prop.id) && (
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{prop.name}</p>
                                                <p className={`text-[10px] mt-0.5 ${
                                                    prop.category === 'product' ? 'text-blue-500' :
                                                    prop.category === 'costume' ? 'text-pink-500' :
                                                    'text-amber-500'
                                                }`}>
                                                    {prop.category === 'product' ? '撮影商品' :
                                                     prop.category === 'costume' ? '衣装' : '小物'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {selectedPropIds.length > 0 && (
                                <p className="text-xs text-primary font-medium">
                                    {selectedPropIds.length}点選択中
                                </p>
                            )}
                        </div>
                    )}

                    {/* 使用するモデル */}
                    {models.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-pink-500">person</span>
                                モデル（任意）
                            </label>
                            <p className="text-xs text-gray-500 -mt-1">このカットで起用するモデルを選択（不要な場合は選択しない）</p>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                                {models.map(model => (
                                    <button
                                        key={model.id}
                                        type="button"
                                        onClick={() => toggleModelSelection(model.id)}
                                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                                            selectedModelIds.includes(model.id)
                                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                                                {model.image ? (
                                                    <img src={model.image} alt={model.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-gray-400">person</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{model.name}</p>
                                                <p className="text-[10px] text-gray-500">{model.gender} / {model.age}歳</p>
                                            </div>
                                            {selectedModelIds.includes(model.id) && (
                                                <span className="material-symbols-outlined text-pink-500">check_circle</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {selectedModelIds.length > 0 && (
                                <p className="text-xs text-pink-500 font-medium">
                                    {selectedModelIds.length}名選択中
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 z-50">
                <div className="flex gap-3 max-w-md mx-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">save</span>
                        保存
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default CutEdit;
