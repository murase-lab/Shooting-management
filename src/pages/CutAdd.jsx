import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useProjects } from '../context/ProjectContext';
import { useModels } from '../context/ModelContext';
import { generateImage, buildImagePrompt } from '../services/aiImageService';
import { readAndResizeImage } from '../utils/imageUtils';
import { ensureImageSize } from '../utils/imageCompressor';

const CutAdd = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const { getProjectById, addCut } = useProjects();
    const { models } = useModels();

    const project = getProjectById(projectId);

    const [step, setStep] = useState(1); // 1: 画像選択, 2: AI生成, 3: 詳細入力
    const [originalImage, setOriginalImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [aiGeneratedImage, setAiGeneratedImage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        scene: '',
        description: '',
        angle: '',
        lighting: '',
        comments: '',
    });

    const [selectedPropIds, setSelectedPropIds] = useState([]);
    const [selectedModelIds, setSelectedModelIds] = useState([]);
    const [errors, setErrors] = useState({});

    const projectProps = project?.props || [];

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
            setOriginalImage(file);
            setErrors(prev => ({ ...prev, image: null }));
            try {
                // 画像をリサイズして保存（localStorage容量対策）
                const resizedImage = await readAndResizeImage(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
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

    // AI画像生成（NanoBanana Pro / Gemini）
    const handleGenerateAI = async () => {
        // プロンプトが空の場合は自動生成
        let prompt = aiPrompt.trim();
        if (!prompt) {
            // 選択された商品情報を取得
            const selectedProduct = projectProps.find(p =>
                p.category === 'product' && selectedPropIds.includes(String(p.id))
            );
            prompt = buildImagePrompt(formData, selectedProduct);
        }

        if (!prompt && !imagePreview) {
            setErrors(prev => ({ ...prev, ai: 'プロンプトを入力するか、元画像をアップロードしてください' }));
            return;
        }

        setIsGenerating(true);
        setErrors(prev => ({ ...prev, ai: null }));

        try {
            // 元画像があれば参照画像として使用
            const result = await generateImage(prompt || '商品撮影のイメージ画像', imagePreview);

            if (result.success && result.imageUrl) {
                setAiGeneratedImage(result.imageUrl);
                setStep(3);
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

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title.trim()) {
            newErrors.title = 'カットタイトルを入力してください';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    // ギャラリーから選択
    const handleGalleryClick = () => {
        galleryInputRef.current?.click();
    };

    // カメラで撮影
    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const togglePropSelection = (propId) => {
        const stringId = String(propId);
        setSelectedPropIds(prev =>
            prev.includes(stringId)
                ? prev.filter(id => id !== stringId)
                : [...prev, stringId]
        );
    };

    const toggleModelSelection = (modelId) => {
        const stringId = String(modelId);
        setSelectedModelIds(prev =>
            prev.includes(stringId)
                ? prev.filter(id => id !== stringId)
                : [...prev, stringId]
        );
    };

    const handleSubmit = async () => {
        if (validateForm()) {
            // AI生成画像も100KB以下に圧縮
            const compressedAiImage = aiGeneratedImage
                ? await ensureImageSize(aiGeneratedImage, 100)
                : null;

            addCut(projectId, {
                ...formData,
                originalImage: imagePreview,
                aiGeneratedImage: compressedAiImage,
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

    if (!project) {
        return (
            <div className="max-w-md mx-auto min-h-screen pb-32">
                <Header title="カット追加" />
                <div className="p-6 text-center">
                    <p className="text-gray-500">プロジェクトが見つかりません</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32 bg-background-light dark:bg-background-dark">
            <Header title="カット指示を追加" subtitle={project.name} />

            {/* Progress Steps */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                step >= s ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                            }`}>
                                {step > s ? (
                                    <span className="material-symbols-outlined text-lg">check</span>
                                ) : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-16 sm:w-24 h-1 mx-2 ${
                                    step > s ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                                }`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                    <span>画像選択</span>
                    <span>AI生成</span>
                    <span>詳細入力</span>
                </div>
            </div>

            <main className="p-6 space-y-6">
                {/* Step 1: Image Upload */}
                {step === 1 && (
                    <section className="space-y-4 animate-fadeIn">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold mb-2">元画像をアップロード</h2>
                            <p className="text-sm text-gray-500">商品のラフ写真または参考画像を選択</p>
                        </div>

                        {/* カメラ撮影用input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                        {/* ギャラリー選択用input */}
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />

                        {imagePreview ? (
                            <>
                                <div className="w-full aspect-[4/3] rounded-2xl border-2 border-primary overflow-hidden">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain bg-black" />
                                </div>
                                {errors.image && <p className="text-red-500 text-xs text-center">{errors.image}</p>}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setOriginalImage(null); setImagePreview(null); }}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                                    >
                                        撮り直す
                                    </button>
                                    <button
                                        onClick={() => setStep(2)}
                                        className="flex-1 py-3 rounded-xl bg-primary text-white font-medium"
                                    >
                                        次へ
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* 選択ボタン */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleCameraClick}
                                        className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 dark:bg-surface-dark hover:border-primary hover:bg-slate-50 dark:hover:bg-surface-dark/80 flex flex-col items-center justify-center transition-all"
                                    >
                                        <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">photo_camera</span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">撮影する</p>
                                        <p className="text-[10px] text-slate-400 mt-1">カメラで撮影</p>
                                    </button>
                                    <button
                                        onClick={handleGalleryClick}
                                        className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 dark:bg-surface-dark hover:border-primary hover:bg-slate-50 dark:hover:bg-surface-dark/80 flex flex-col items-center justify-center transition-all"
                                    >
                                        <span className="material-symbols-outlined text-5xl text-slate-400 mb-2">photo_library</span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">写真から選択</p>
                                        <p className="text-[10px] text-slate-400 mt-1">ライブラリから選択</p>
                                    </button>
                                </div>
                                {errors.image && <p className="text-red-500 text-xs text-center">{errors.image}</p>}

                                {/* スキップオプション */}
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    画像なしで続ける
                                </button>
                            </>
                        )}
                    </section>
                )}

                {/* Step 2: AI Generation */}
                {step === 2 && (
                    <section className="space-y-4 animate-fadeIn">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold mb-2">AI完成予想図を生成</h2>
                            <p className="text-sm text-gray-500">
                                {imagePreview
                                    ? 'プロンプトを入力してイメージを生成'
                                    : 'プロンプトからイメージを生成（元画像なし）'}
                            </p>
                        </div>

                        {imagePreview ? (
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black">
                                <img src={imagePreview} alt="Original" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-5xl text-gray-400">image_not_supported</span>
                                    <p className="text-sm text-gray-500 mt-2">元画像なし（プロンプトのみで生成）</p>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium">生成プロンプト</label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 min-h-[100px] resize-none"
                                placeholder="例：商品を高級感のある大理石の背景に配置し、柔らかい自然光で撮影したイメージ..."
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {['高級感', '自然光', 'ミニマル', 'カラフル', '清潔感'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setAiPrompt(prev => prev ? `${prev} ${tag}` : tag)}
                                    className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>

                        {errors.ai && <p className="text-red-500 text-xs text-center">{errors.ai}</p>}

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleGenerateAI}
                                disabled={isGenerating}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
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

                        <button
                            onClick={() => { setAiGeneratedImage(null); setStep(3); }}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
                        >
                            AI生成をスキップ
                        </button>
                    </section>
                )}

                {/* Step 3: Details */}
                {step === 3 && (
                    <section className="space-y-6 animate-fadeIn">
                        <div className="text-center mb-4">
                            <h2 className="text-xl font-bold mb-2">カット詳細を入力</h2>
                            <p className="text-sm text-gray-500">撮影指示の詳細を記入</p>
                        </div>

                        {/* Image Preview */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">元画像</p>
                                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Original" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-400">image</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase font-bold">AI生成</p>
                                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                    {aiGeneratedImage ? (
                                        <img src={aiGeneratedImage} alt="AI Generated" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-400">auto_awesome</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-4">
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
                                        {projectProps.map(prop => {
                                            const isSelected = selectedPropIds.includes(String(prop.id));
                                            return (
                                            <button
                                                key={prop.id}
                                                type="button"
                                                onClick={() => togglePropSelection(prop.id)}
                                                className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                    isSelected
                                                        ? 'border-primary bg-primary/10'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className={`size-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                                        isSelected
                                                            ? 'bg-primary border-primary text-white'
                                                            : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && (
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
                                            );
                                        })}
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
                                        {models.map(model => {
                                            const isSelected = selectedModelIds.includes(String(model.id));
                                            return (
                                            <button
                                                key={model.id}
                                                type="button"
                                                onClick={() => toggleModelSelection(model.id)}
                                                className={`p-3 rounded-xl border-2 text-left transition-all ${
                                                    isSelected
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
                                                    {isSelected && (
                                                        <span className="material-symbols-outlined text-pink-500">check_circle</span>
                                                    )}
                                                </div>
                                            </button>
                                            );
                                        })}
                                    </div>
                                    {selectedModelIds.length > 0 && (
                                        <p className="text-xs text-pink-500 font-medium">
                                            {selectedModelIds.length}名選択中
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                戻る
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                カットを追加
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default CutAdd;
