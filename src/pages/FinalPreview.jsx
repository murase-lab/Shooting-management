import { useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';
import { useModels } from '../context/ModelContext';

const CATEGORIES = {
    product: { label: '撮影商品', icon: 'inventory_2', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    prop: { label: '小物・備品', icon: 'chair', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
    costume: { label: 'モデル衣装', icon: 'checkroom', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
};

const FinalPreview = () => {
    const { id } = useParams();
    const { getProjectById, getPropsForCut, getModelIdsForProject } = useProjects();
    const { getModelById } = useModels();
    const pdfContentRef = useRef(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const project = getProjectById(id);

    // プロジェクトで使用されているモデル一覧
    const projectModels = useMemo(() => {
        if (!project) return [];
        const modelIds = getModelIdsForProject(id);
        return modelIds.map(mid => getModelById(mid)).filter(Boolean);
    }, [project, id, getModelIdsForProject, getModelById]);

    // カットで使用されているモデルを取得
    const getModelsForCut = (cut) => {
        return (cut.modelIds || []).map(mid => getModelById(mid)).filter(Boolean);
    };

    // 商品一覧（productカテゴリ）
    const products = useMemo(() => {
        if (!project) return [];
        return (project.props || []).filter(p => p.category === 'product');
    }, [project]);

    // 小物・備品一覧
    const propsAndCostumes = useMemo(() => {
        if (!project) return [];
        return (project.props || []).filter(p => p.category !== 'product');
    }, [project]);

    // 商品別カットをグルーピング
    const cutsByProduct = useMemo(() => {
        if (!project) return [];

        const grouped = [];

        // 各商品ごとにカットをグルーピング
        products.forEach(product => {
            const productCuts = project.cuts.filter(cut =>
                (cut.propIds || []).includes(product.id)
            );
            if (productCuts.length > 0) {
                // シーン別にさらにグルーピング
                const scenes = {};
                productCuts.forEach(cut => {
                    const scene = cut.scene || 'その他';
                    if (!scenes[scene]) {
                        scenes[scene] = [];
                    }
                    scenes[scene].push(cut);
                });
                grouped.push({
                    product,
                    scenes,
                    totalCuts: productCuts.length,
                });
            }
        });

        // 商品に紐づいていないカット
        const unassignedCuts = project.cuts.filter(cut => {
            const cutProductIds = (cut.propIds || []).filter(propId =>
                products.some(p => p.id === propId)
            );
            return cutProductIds.length === 0;
        });

        if (unassignedCuts.length > 0) {
            const scenes = {};
            unassignedCuts.forEach(cut => {
                const scene = cut.scene || 'その他';
                if (!scenes[scene]) {
                    scenes[scene] = [];
                }
                scenes[scene].push(cut);
            });
            grouped.push({
                product: null,
                scenes,
                totalCuts: unassignedCuts.length,
            });
        }

        return grouped;
    }, [project, products]);

    if (!project) {
        return (
            <Layout activeNav="project">
                <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8 dark text-white bg-background-dark">
                    <Header title="指示書プレビュー" />
                    <div className="p-6 text-center">
                        <span className="material-symbols-outlined text-6xl text-gray-500 mb-4">description_off</span>
                        <p className="text-gray-400 mb-4">プロジェクトが見つかりません</p>
                        <Link to="/project-overview" className="text-primary font-bold hover:underline">
                            プロジェクト一覧に戻る
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!pdfContentRef.current || isGeneratingPdf) return;

        setIsGeneratingPdf(true);

        try {
            const element = pdfContentRef.current;

            // 一時的に表示状態にする
            element.style.position = 'absolute';
            element.style.left = '0';
            element.style.top = '0';
            element.style.visibility = 'visible';
            element.style.zIndex = '-1';

            // html2canvasでキャプチャ
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: true, // デバッグ用にログを有効化
                backgroundColor: '#ffffff',
                windowWidth: 794,
                windowHeight: element.scrollHeight,
            });

            const imgData = canvas.toDataURL('image/png');

            // A4サイズ（210mm x 297mm）
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // 画像をPDF幅に合わせてスケーリング
            const scaledWidth = pdfWidth;
            const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

            // 1ページに収まる場合
            if (scaledHeight <= pdfHeight) {
                pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight);
            } else {
                // 複数ページに分割する場合
                let yOffset = 0;
                let pageNum = 0;

                while (yOffset < scaledHeight) {
                    if (pageNum > 0) {
                        pdf.addPage();
                    }

                    // 画像の一部をクリップして描画
                    pdf.addImage(imgData, 'PNG', 0, -yOffset, scaledWidth, scaledHeight);

                    yOffset += pdfHeight;
                    pageNum++;
                }
            }

            // ダウンロード
            pdf.save(`撮影指示書_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF生成エラー:', error);
            alert('PDFの生成に失敗しました: ' + error.message);
        } finally {
            // 元の非表示状態に戻す
            const element = pdfContentRef.current;
            if (element) {
                element.style.position = 'fixed';
                element.style.left = '-9999px';
                element.style.visibility = 'hidden';
                element.style.zIndex = '';
            }
            setIsGeneratingPdf(false);
        }
    };

    return (
        <Layout activeNav="project">
            <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-40 lg:pb-32 dark text-white bg-background-dark print:bg-white print:text-black print:max-w-none print:pb-8">
                <Header title="指示書プレビュー" />

                <main className="p-4 lg:p-6 space-y-6 lg:space-y-8">
                {/* ===== 撮影概要 ===== */}
                <section className="bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 rounded-2xl p-5 lg:p-8 print:bg-gray-50 print:border-gray-300">
                    <div className="flex items-start gap-4 lg:gap-6">
                        {project.productImage && (
                            <div className="w-20 h-20 lg:w-32 lg:h-32 rounded-xl overflow-hidden shrink-0 bg-gray-800">
                                <img src={project.productImage} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-xl lg:text-3xl font-bold tracking-tight mb-1 lg:mb-2">{project.name}</h1>
                            {project.shootingDate && (
                                <div className="flex items-center gap-1.5 text-sm lg:text-base text-slate-300 print:text-gray-600">
                                    <span className="material-symbols-outlined text-sm lg:text-base">calendar_today</span>
                                    <span>{project.shootingDate}</span>
                                </div>
                            )}
                            {project.description && (
                                <p className="text-sm lg:text-base text-slate-400 mt-2 print:text-gray-600">{project.description}</p>
                            )}
                        </div>
                    </div>

                    {/* サマリー */}
                    <div className={`grid gap-3 lg:gap-6 mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-white/10 print:border-gray-300 ${projectModels.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold text-primary">{project.cuts.length}</p>
                            <p className="text-[10px] lg:text-sm text-slate-400 print:text-gray-500">総カット数</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold text-blue-400">{products.length}</p>
                            <p className="text-[10px] lg:text-sm text-slate-400 print:text-gray-500">撮影商品</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold text-amber-400">{propsAndCostumes.length}</p>
                            <p className="text-[10px] lg:text-sm text-slate-400 print:text-gray-500">小物・衣装</p>
                        </div>
                        {projectModels.length > 0 && (
                            <div className="text-center">
                                <p className="text-2xl lg:text-4xl font-bold text-pink-400">{projectModels.length}</p>
                                <p className="text-[10px] lg:text-sm text-slate-400 print:text-gray-500">モデル</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ===== 撮影商品一覧 ===== */}
                {products.length > 0 && (
                    <section className="print:break-inside-avoid">
                        <h2 className="text-sm lg:text-base font-bold text-slate-400 uppercase tracking-widest mb-3 lg:mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400">inventory_2</span>
                            撮影商品一覧
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                            {products.map((product, idx) => {
                                const cutCount = project.cuts.filter(c => (c.propIds || []).includes(product.id)).length;
                                return (
                                    <div
                                        key={product.id}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 print:bg-gray-50 print:border-gray-200"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded print:bg-blue-100 print:text-blue-700">
                                                商品{idx + 1}
                                            </span>
                                        </div>
                                        {product.image ? (
                                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-800 mb-2">
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="aspect-square rounded-lg bg-gray-800 mb-2 flex items-center justify-center print:bg-gray-200">
                                                <span className="material-symbols-outlined text-3xl text-gray-600">inventory_2</span>
                                            </div>
                                        )}
                                        <h3 className="text-sm font-bold truncate">{product.name}</h3>
                                        {product.notes && (
                                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{product.notes}</p>
                                        )}
                                        <p className="text-[10px] text-primary mt-1">{cutCount}カット</p>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ===== モデル一覧 ===== */}
                {projectModels.length > 0 && (
                    <section className="print:break-inside-avoid">
                        <h2 className="text-sm lg:text-base font-bold text-slate-400 uppercase tracking-widest mb-3 lg:mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-pink-400">person</span>
                            起用モデル
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                            {projectModels.map((model) => {
                                const modelCuts = project.cuts.filter(c => (c.modelIds || []).includes(model.id));
                                return (
                                    <div
                                        key={model.id}
                                        className="bg-white/5 border border-white/10 rounded-xl p-3 print:bg-gray-50 print:border-gray-200"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 shrink-0">
                                                {model.image ? (
                                                    <img src={model.image} alt={model.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-xl text-gray-500">person</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold truncate">{model.name}</h3>
                                                <p className="text-[10px] text-slate-400">{model.gender} / {model.age}歳</p>
                                                <p className="text-[10px] text-pink-400 mt-0.5">{modelCuts.length}カット出演</p>
                                            </div>
                                        </div>
                                        {(model.topSize || model.bottomSize || model.shoeSize) && (
                                            <div className="mt-2 pt-2 border-t border-white/10 print:border-gray-200">
                                                <div className="flex gap-2 text-[9px] text-slate-400">
                                                    {model.topSize && <span>Top: {model.topSize}</span>}
                                                    {model.bottomSize && <span>Bottom: {model.bottomSize}</span>}
                                                    {model.shoeSize && <span>Shoes: {model.shoeSize}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ===== 小物・備品・衣装一覧 ===== */}
                {propsAndCostumes.length > 0 && (
                    <section className="print:break-inside-avoid">
                        <h2 className="text-sm lg:text-base font-bold text-slate-400 uppercase tracking-widest mb-3 lg:mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400">chair</span>
                            小物・備品・衣装
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-xl print:bg-gray-50 print:border-gray-200 lg:grid lg:grid-cols-2 xl:grid-cols-3 divide-y lg:divide-y-0 divide-white/5 print:divide-gray-200">
                            {propsAndCostumes.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-3 lg:p-4 lg:border-b lg:border-r lg:border-white/5 print:border-gray-200">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${CATEGORIES[item.category]?.bgColor || 'bg-gray-700'}`}>
                                        {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <span className={`material-symbols-outlined text-lg ${CATEGORIES[item.category]?.color || 'text-gray-400'}`}>
                                                {CATEGORIES[item.category]?.icon || 'inventory_2'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                                item.category === 'costume'
                                                    ? 'bg-pink-500/20 text-pink-400 print:bg-pink-100 print:text-pink-700'
                                                    : 'bg-amber-500/20 text-amber-400 print:bg-amber-100 print:text-amber-700'
                                            }`}>
                                                {CATEGORIES[item.category]?.label}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium truncate">{item.name}</p>
                                        {item.notes && (
                                            <p className="text-[10px] text-slate-400 truncate">{item.notes}</p>
                                        )}
                                    </div>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        item.checked ? 'bg-green-500 text-white' : 'bg-gray-700 print:bg-gray-300'
                                    }`}>
                                        {item.checked && <span className="material-symbols-outlined text-sm">check</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ===== 商品別カット詳細 ===== */}
                {cutsByProduct.length > 0 && (
                    <section>
                        <h2 className="text-sm lg:text-base font-bold text-slate-400 uppercase tracking-widest mb-4 lg:mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">photo_library</span>
                            撮影カット詳細
                        </h2>

                        <div className="space-y-8 lg:space-y-10">
                            {cutsByProduct.map((group, groupIdx) => (
                                <div key={group.product?.id || 'unassigned'} className="print:break-inside-avoid-page">
                                    {/* 商品ヘッダー */}
                                    <div className={`flex items-center gap-3 p-3 rounded-t-xl ${
                                        group.product
                                            ? 'bg-blue-500/20 border border-blue-500/30 print:bg-blue-50 print:border-blue-200'
                                            : 'bg-gray-500/20 border border-gray-500/30 print:bg-gray-100 print:border-gray-300'
                                    }`}>
                                        {group.product ? (
                                            <>
                                                {group.product.image ? (
                                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                                        <img src={group.product.image} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-blue-500/30 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-xl text-blue-400">inventory_2</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-blue-400 font-bold uppercase">商品 {groupIdx + 1}</p>
                                                    <h3 className="text-base font-bold">{group.product.name}</h3>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1">
                                                <h3 className="text-base font-bold text-slate-400">その他のカット</h3>
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-primary">{group.totalCuts}</p>
                                            <p className="text-[10px] text-slate-400">カット</p>
                                        </div>
                                    </div>

                                    {/* シーン別カット */}
                                    <div className="border-x border-b border-white/10 rounded-b-xl overflow-hidden print:border-gray-200">
                                        {Object.entries(group.scenes).map(([sceneName, cuts], sceneIdx) => (
                                            <div key={sceneName} className={sceneIdx > 0 ? 'border-t border-white/10 print:border-gray-200' : ''}>
                                                {/* シーンヘッダー */}
                                                <div className="bg-purple-500/10 px-4 py-2 flex items-center gap-2 print:bg-purple-50">
                                                    <span className="material-symbols-outlined text-sm text-purple-400">movie</span>
                                                    <span className="text-xs font-bold text-purple-400">{sceneName}</span>
                                                    <span className="text-[10px] text-slate-500 ml-auto">{cuts.length}カット</span>
                                                </div>

                                                {/* カット一覧 - grid on desktop */}
                                                <div className="divide-y lg:divide-y-0 divide-white/5 print:divide-gray-200 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:p-4">
                                                    {cuts.map((cut) => {
                                                        const cutProps = getPropsForCut(id, cut.id);
                                                        const globalIndex = project.cuts.findIndex(c => c.id === cut.id);
                                                        return (
                                                            <article key={cut.id} className="p-4 lg:p-0 lg:border lg:border-white/10 lg:rounded-xl lg:overflow-hidden print:break-inside-avoid print:border print:border-gray-200 print:rounded-lg print:mb-3">
                                                                <div className="flex lg:flex-col gap-4 lg:gap-0">
                                                                    {/* サムネイル */}
                                                                    <div className="w-28 lg:w-full shrink-0">
                                                                        <div className="aspect-[4/3] lg:aspect-video rounded-lg lg:rounded-none overflow-hidden bg-gray-800 print:bg-gray-200 relative">
                                                                            {cut.aiGeneratedImage ? (
                                                                                <>
                                                                                    <img src={cut.aiGeneratedImage} alt="" className="w-full h-full object-cover" />
                                                                                    <div className="absolute top-1 left-1 bg-purple-500 text-white text-[8px] px-1 py-0.5 rounded flex items-center gap-0.5">
                                                                                        <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                                                                        AI
                                                                                    </div>
                                                                                </>
                                                                            ) : cut.originalImage ? (
                                                                                <img src={cut.originalImage} alt="" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center">
                                                                                    <span className="material-symbols-outlined text-2xl text-gray-600">image</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-1 text-center">
                                                                            <span className="text-xs font-bold text-primary">
                                                                                CUT #{String(globalIndex + 1).padStart(2, '0')}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* カット詳細 */}
                                                                    <div className="flex-1 min-w-0 space-y-2 lg:p-4">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <h4 className="text-sm font-bold">{cut.title}</h4>
                                                                            <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${
                                                                                cut.status === 'completed'
                                                                                    ? 'bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-700'
                                                                                    : 'bg-gray-500/20 text-gray-400 print:bg-gray-100 print:text-gray-600'
                                                                            }`}>
                                                                                {cut.status === 'completed' ? '完了' : '未完了'}
                                                                            </span>
                                                                        </div>

                                                                        {/* タグ */}
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {cut.angle && (
                                                                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded print:bg-gray-200 print:text-gray-700">
                                                                                    {cut.angle}
                                                                                </span>
                                                                            )}
                                                                            {cut.lighting && (
                                                                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded print:bg-gray-200 print:text-gray-700">
                                                                                    {cut.lighting}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* 撮影指示 */}
                                                                        {cut.comments && (
                                                                            <div className="bg-white/5 rounded-lg p-2 print:bg-gray-100">
                                                                                <p className="text-[10px] font-bold text-slate-400 mb-0.5">撮影指示</p>
                                                                                <p className="text-xs text-slate-300 whitespace-pre-wrap print:text-gray-700">{cut.comments}</p>
                                                                            </div>
                                                                        )}

                                                                        {/* 使用アイテム */}
                                                                        {cutProps.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {cutProps.map(prop => (
                                                                                    <span
                                                                                        key={prop.id}
                                                                                        className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded ${CATEGORIES[prop.category]?.bgColor} print:bg-gray-200`}
                                                                                    >
                                                                                        <span className={`material-symbols-outlined text-[10px] ${CATEGORIES[prop.category]?.color}`}>
                                                                                            {CATEGORIES[prop.category]?.icon}
                                                                                        </span>
                                                                                        {prop.name}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {/* 出演モデル */}
                                                                        {getModelsForCut(cut).length > 0 && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="material-symbols-outlined text-xs text-pink-400">person</span>
                                                                                <div className="flex items-center gap-1">
                                                                                    {getModelsForCut(cut).map(model => (
                                                                                        <div key={model.id} className="flex items-center gap-1 bg-pink-500/20 px-1.5 py-0.5 rounded print:bg-pink-100">
                                                                                            {model.image && (
                                                                                                <img src={model.image} alt="" className="w-4 h-4 rounded-full object-cover" />
                                                                                            )}
                                                                                            <span className="text-[9px] text-pink-400 print:text-pink-700">{model.name}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </article>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {project.cuts.length === 0 && (
                    <div className="text-center py-12 bg-white/5 rounded-xl">
                        <span className="material-symbols-outlined text-4xl text-gray-500 mb-2">photo_library</span>
                        <p className="text-sm text-gray-400 mb-4">カットがまだありません</p>
                        <Link
                            to={`/cut-add/${id}`}
                            className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            カットを追加
                        </Link>
                    </div>
                )}

                {/* Print-only footer */}
                <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                    Shooting Master - 撮影指示書 | {project.name} | {new Date().toLocaleDateString('ja-JP')}
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-background-dark/90 backdrop-blur-xl border-t border-white/10 print:hidden">
                <div className="flex gap-3 max-w-md lg:max-w-lg mx-auto">
                    <button
                        onClick={handlePrint}
                        className="flex-1 bg-white/10 text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                    >
                        <span className="material-symbols-outlined">print</span>
                        <span>印刷</span>
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex-1 bg-primary text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                <span>生成中...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">picture_as_pdf</span>
                                <span>PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </footer>
        </div>

        {/* PDF用の非表示コンテンツ（A4最適化レイアウト） - Tailwindを使わずインラインスタイルで記述 */}
        <div
            ref={pdfContentRef}
            style={{
                width: '794px',
                position: 'fixed',
                left: '-9999px',
                top: '0',
                visibility: 'hidden',
                backgroundColor: '#ffffff',
                color: '#111827',
                padding: '32px',
                fontFamily: 'sans-serif',
            }}
        >
                {/* ヘッダー */}
                <div style={{ borderBottom: '2px solid #1f2937', paddingBottom: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                        {project.productImage && (
                            <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e5e7eb', flexShrink: 0 }}>
                                <img src={project.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>{project.name}</h1>
                            <p style={{ fontSize: '14px', color: '#4b5563' }}>撮影指示書</p>
                            {project.shootingDate && (
                                <p style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>撮影日: {project.shootingDate}</p>
                            )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                            <p>{new Date().toLocaleDateString('ja-JP')}</p>
                        </div>
                    </div>
                </div>

                {/* サマリー */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#2563eb' }}>{project.cuts.length}</p>
                        <p style={{ fontSize: '12px', color: '#4b5563' }}>総カット数</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#16a34a' }}>{products.length}</p>
                        <p style={{ fontSize: '12px', color: '#4b5563' }}>撮影商品</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#d97706' }}>{propsAndCostumes.length}</p>
                        <p style={{ fontSize: '12px', color: '#4b5563' }}>小物・衣装</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#db2777' }}>{projectModels.length}</p>
                        <p style={{ fontSize: '12px', color: '#4b5563' }}>モデル</p>
                    </div>
                </div>

                {/* 撮影商品一覧 */}
                {products.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', paddingBottom: '4px', borderBottom: '1px solid #d1d5db' }}>撮影商品一覧</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {products.map((product, idx) => {
                                const cutCount = project.cuts.filter(c => (c.propIds || []).includes(product.id)).length;
                                return (
                                    <div key={product.id} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                                                商品{idx + 1}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{cutCount}カット</span>
                                        </div>
                                        {product.image && (
                                            <div style={{ width: '100%', height: '120px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e5e7eb', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <img src={product.image} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                            </div>
                                        )}
                                        <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{product.name}</p>
                                        {product.notes && (
                                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{product.notes}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* モデル一覧 */}
                {projectModels.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', paddingBottom: '4px', borderBottom: '1px solid #d1d5db' }}>起用モデル</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {projectModels.map((model) => {
                                const modelCuts = project.cuts.filter(c => (c.modelIds || []).includes(model.id));
                                return (
                                    <div key={model.id} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#e5e7eb', flexShrink: 0 }}>
                                            {model.image ? (
                                                <img src={model.image} alt={model.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                                    <span style={{ fontSize: '20px' }}>👤</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 'bold' }}>{model.name}</p>
                                            <p style={{ fontSize: '12px', color: '#6b7280' }}>{model.gender} / {model.age}歳</p>
                                            <p style={{ fontSize: '12px', color: '#db2777' }}>{modelCuts.length}カット出演</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 小物・備品・衣装一覧 */}
                {propsAndCostumes.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', paddingBottom: '4px', borderBottom: '1px solid #d1d5db' }}>小物・備品・衣装</h2>
                        <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                    <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #d1d5db' }}>カテゴリ</th>
                                    <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #d1d5db' }}>アイテム名</th>
                                    <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #d1d5db' }}>備考</th>
                                    <th style={{ textAlign: 'center', padding: '8px', border: '1px solid #d1d5db', width: '64px' }}>準備</th>
                                </tr>
                            </thead>
                            <tbody>
                                {propsAndCostumes.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: item.category === 'costume' ? '#fce7f3' : '#fef3c7',
                                                color: item.category === 'costume' ? '#be185d' : '#b45309'
                                            }}>
                                                {CATEGORIES[item.category]?.label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #d1d5db', fontWeight: '500' }}>{item.name}</td>
                                        <td style={{ padding: '8px', border: '1px solid #d1d5db', color: '#6b7280' }}>{item.notes || '-'}</td>
                                        <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                                            {item.checked ? '✓' : '□'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* カット一覧（画像付き） */}
                {project.cuts.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', paddingBottom: '4px', borderBottom: '1px solid #d1d5db' }}>撮影カット一覧</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            {project.cuts.map((cut, idx) => (
                                <div key={cut.id} style={{ border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', gap: '12px', padding: '12px' }}>
                                        {/* カット画像 */}
                                        <div style={{ width: '100px', height: '75px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#e5e7eb', flexShrink: 0 }}>
                                            {cut.aiGeneratedImage ? (
                                                <img src={cut.aiGeneratedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : cut.originalImage ? (
                                                <img src={cut.originalImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                                    <span style={{ fontSize: '24px' }}>📷</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* カット情報 */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>
                                                    #{String(idx + 1).padStart(2, '0')}
                                                </span>
                                                {cut.scene && (
                                                    <span style={{ fontSize: '10px', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                                                        {cut.scene}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>{cut.title}</p>
                                            {cut.comments && (
                                                <p style={{ fontSize: '11px', color: '#4b5563', lineHeight: '1.4' }}>
                                                    {cut.comments.length > 80 ? cut.comments.slice(0, 80) + '...' : cut.comments}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* フッター */}
                <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #d1d5db', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                    Shooting Master - 撮影指示書 | {project.name} | {new Date().toLocaleDateString('ja-JP')}
                </div>
        </div>
        </Layout>
    );
};

export default FinalPreview;
