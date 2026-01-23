import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';
import { useModels } from '../context/ModelContext';

const CATEGORIES = {
    product: { label: '撮影商品', icon: 'inventory_2', color: 'text-blue-500' },
    prop: { label: '小物', icon: 'chair', color: 'text-amber-500' },
    costume: { label: '衣装', icon: 'checkroom', color: 'text-pink-500' },
};

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getProjectById, getProjectProgress, getPropsForCut, updateCut, deleteCut, copyCut, deleteProject, updateProject } = useProjects();
    const { models } = useModels();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingCutId, setDeletingCutId] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);

    // フィルター状態
    const [filterType, setFilterType] = useState('all'); // 'all', 'scene', 'product', 'status'
    const [selectedFilter, setSelectedFilter] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'grid'

    const project = getProjectById(id);
    const progress = getProjectProgress(id);

    // シーン一覧を取得
    const scenes = useMemo(() => {
        if (!project) return [];
        const sceneSet = new Set(project.cuts.filter(c => c.scene).map(c => c.scene));
        return Array.from(sceneSet);
    }, [project]);

    // 商品一覧を取得（propsからproductカテゴリのみ）
    const products = useMemo(() => {
        if (!project) return [];
        return (project.props || []).filter(p => p.category === 'product');
    }, [project]);

    // フィルタリングされたカット
    const filteredCuts = useMemo(() => {
        if (!project) return [];
        let cuts = [...project.cuts];

        if (filterType === 'scene' && selectedFilter) {
            cuts = cuts.filter(c => c.scene === selectedFilter);
        } else if (filterType === 'product' && selectedFilter) {
            cuts = cuts.filter(c => (c.propIds || []).includes(selectedFilter));
        } else if (filterType === 'status' && selectedFilter) {
            cuts = cuts.filter(c => c.status === selectedFilter);
        }

        return cuts;
    }, [project, filterType, selectedFilter]);

    if (!project) {
        return (
            <Layout activeNav="project">
                <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8">
                    <Header title="プロジェクト詳細" />
                    <div className="p-6 text-center">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">folder_off</span>
                        <p className="text-gray-500 mb-4">プロジェクトが見つかりません</p>
                        <Link to="/project-overview" className="text-primary font-bold hover:underline">
                            プロジェクト一覧に戻る
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const handleToggleCutStatus = (cutId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
        updateCut(id, cutId, { status: newStatus });
    };

    const handleDeleteCut = (cutId) => {
        deleteCut(id, cutId);
        setDeletingCutId(null);
    };

    const handleDeleteProject = () => {
        deleteProject(project.id);
        navigate('/project-overview');
    };

    const handleFilterChange = (type, value) => {
        if (filterType === type && selectedFilter === value) {
            // 同じフィルターをクリックしたらクリア
            setFilterType('all');
            setSelectedFilter(null);
        } else {
            setFilterType(type);
            setSelectedFilter(value);
        }
    };

    const clearFilter = () => {
        setFilterType('all');
        setSelectedFilter(null);
    };

    const statusColors = {
        draft: 'bg-gray-100 text-gray-600',
        in_progress: 'bg-blue-100 text-blue-600',
        completed: 'bg-green-100 text-green-600',
    };

    const statusLabels = {
        draft: '下書き',
        in_progress: '進行中',
        completed: '完了',
    };

    return (
        <Layout activeNav="project">
            <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8">
                <Header title="プロジェクト詳細" rightIcon="more_vert" />

                <main className="p-4 lg:p-6 space-y-4 lg:space-y-6">
                {/* Project Header - Compact on mobile, expanded on desktop */}
                <section className="bg-surface-dark rounded-2xl overflow-hidden text-white">
                    <div className="flex lg:flex-row">
                        {project.productImage && (
                            <div className="w-24 h-24 lg:w-48 lg:h-48 bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${project.productImage})` }} />
                        )}
                        <div className="flex-1 p-4 lg:p-6">
                            <div className="flex items-center gap-2 mb-1 lg:mb-2">
                                <button
                                    onClick={() => setShowStatusModal(true)}
                                    className={`text-[10px] lg:text-xs font-bold px-2 py-0.5 rounded ${statusColors[project.status]} flex items-center gap-1 hover:opacity-80 transition-opacity`}
                                >
                                    {statusLabels[project.status]}
                                    <span className="material-symbols-outlined text-xs">expand_more</span>
                                </button>
                            </div>
                            <h1 className="text-lg lg:text-2xl font-bold leading-tight">{project.name}</h1>
                            {project.shootingDate && (
                                <p className="text-[11px] lg:text-sm text-slate-400 mt-1 lg:mt-2">
                                    撮影: {project.shootingDate}
                                </p>
                            )}
                            {/* Progress Bar - inline on desktop */}
                            <div className="hidden lg:block mt-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-400">進捗</span>
                                    <span className="text-lg font-bold text-primary">{progress}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {project.cuts.filter(c => c.status === 'completed').length} / {project.cuts.length} カット完了
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Progress Bar - mobile only */}
                    <div className="px-4 pb-3 lg:hidden">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-slate-400">進捗</span>
                            <span className="text-sm font-bold text-primary">{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            {project.cuts.filter(c => c.status === 'completed').length} / {project.cuts.length} カット完了
                        </p>
                    </div>
                </section>

                {/* Filter Section */}
                <section className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">絞り込み</h3>
                        <div className="flex items-center gap-2">
                            {filterType !== 'all' && (
                                <button
                                    onClick={clearFilter}
                                    className="text-xs text-primary flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">close</span>
                                    クリア
                                </button>
                            )}
                            {/* View Mode Toggle */}
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-sm">view_list</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                                >
                                    <span className="material-symbols-outlined text-sm">grid_view</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {/* Status Filters */}
                        <button
                            onClick={() => handleFilterChange('status', 'pending')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                filterType === 'status' && selectedFilter === 'pending'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">pending</span>
                            未完了
                        </button>
                        <button
                            onClick={() => handleFilterChange('status', 'completed')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                filterType === 'status' && selectedFilter === 'completed'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            完了済
                        </button>
                    </div>

                    {/* Scene Filters */}
                    {scenes.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[10px] text-gray-400 mb-1.5">シーン別</p>
                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                {scenes.map(scene => (
                                    <button
                                        key={scene}
                                        onClick={() => handleFilterChange('scene', scene)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                            filterType === 'scene' && selectedFilter === scene
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                        }`}
                                    >
                                        {scene}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Product Filters */}
                    {products.length > 0 && (
                        <div className="mt-2">
                            <p className="text-[10px] text-gray-400 mb-1.5">商品別</p>
                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleFilterChange('product', product.id)}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                            filterType === 'product' && selectedFilter === product.id
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                                        {product.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Cuts Section */}
                <section>
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <h2 className="text-lg lg:text-xl font-bold">カット一覧</h2>
                        <span className="text-xs lg:text-sm text-gray-500">
                            {filterType !== 'all' && `${filteredCuts.length} / `}{project.cuts.length}件
                        </span>
                    </div>

                    {filteredCuts.length > 0 ? (
                        viewMode === 'list' ? (
                            // List View - 指示書のような詳細表示
                            <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                                {filteredCuts.map((cut, index) => {
                                    const cutProps = getPropsForCut(id, cut.id);
                                    const originalIndex = project.cuts.findIndex(c => c.id === cut.id);
                                    // カットに紐づいたモデルを取得
                                    const cutModels = (cut.modelIds || [])
                                        .map(modelId => models.find(m => m.id === modelId))
                                        .filter(Boolean);
                                    // カテゴリ別に分類
                                    const productProps = cutProps.filter(p => p.category === 'product');
                                    const otherProps = cutProps.filter(p => p.category !== 'product');

                                    return (
                                        <div
                                            key={cut.id}
                                            className={`bg-white dark:bg-gray-800 rounded-xl border overflow-hidden ${
                                                cut.status === 'completed'
                                                    ? 'border-green-200 dark:border-green-800'
                                                    : 'border-gray-100 dark:border-gray-700'
                                            }`}
                                        >
                                            {/* Header with status */}
                                            <div className={`px-3 py-2 flex items-center justify-between ${
                                                cut.status === 'completed'
                                                    ? 'bg-green-50 dark:bg-green-900/20'
                                                    : 'bg-gray-50 dark:bg-gray-700/50'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-primary">
                                                        #{String(originalIndex + 1).padStart(2, '0')}
                                                    </span>
                                                    {cut.scene && (
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded">
                                                            {cut.scene}
                                                        </span>
                                                    )}
                                                    {cut.aiGeneratedImage && (
                                                        <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                            <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                                            AI
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleToggleCutStatus(cut.id, cut.status)}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                                                        cut.status === 'completed'
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-sm">
                                                        {cut.status === 'completed' ? 'check_circle' : 'radio_button_unchecked'}
                                                    </span>
                                                    {cut.status === 'completed' ? '完了' : '未完了'}
                                                </button>
                                            </div>

                                            <div className="flex">
                                                {/* Thumbnail */}
                                                <div className="w-28 h-28 lg:w-32 lg:h-32 bg-gray-100 dark:bg-gray-700 flex-shrink-0 relative">
                                                    {cut.aiGeneratedImage || cut.originalImage ? (
                                                        <img
                                                            src={cut.aiGeneratedImage || cut.originalImage}
                                                            alt={cut.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-2xl text-gray-400">image</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 p-3 min-w-0">
                                                    <h3 className="text-sm font-bold mb-2 truncate">{cut.title}</h3>

                                                    {/* Shooting Info Tags */}
                                                    {(cut.angle || cut.lighting) && (
                                                        <div className="flex items-center gap-1 mb-2 flex-wrap">
                                                            {cut.angle && (
                                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-[10px] text-gray-500">videocam</span>
                                                                    {cut.angle}
                                                                </span>
                                                            )}
                                                            {cut.lighting && (
                                                                <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-[10px] text-gray-500">wb_sunny</span>
                                                                    {cut.lighting}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Models */}
                                                    {cutModels.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="material-symbols-outlined text-xs text-pink-500">person</span>
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {cutModels.map(model => (
                                                                    <span
                                                                        key={model.id}
                                                                        className="text-[10px] bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400 px-1.5 py-0.5 rounded"
                                                                    >
                                                                        {model.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Products */}
                                                    {productProps.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="material-symbols-outlined text-xs text-blue-500">inventory_2</span>
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {productProps.map(prop => (
                                                                    <span
                                                                        key={prop.id}
                                                                        className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-1.5 py-0.5 rounded"
                                                                    >
                                                                        {prop.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Props & Costumes */}
                                                    {otherProps.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="material-symbols-outlined text-xs text-amber-500">chair</span>
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {otherProps.map(prop => (
                                                                    <span
                                                                        key={prop.id}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                                            prop.category === 'costume'
                                                                                ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400'
                                                                                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                                                        }`}
                                                                    >
                                                                        {prop.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Comments / Memo */}
                                            {cut.comments && (
                                                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/20">
                                                    <div className="flex items-start gap-1.5">
                                                        <span className="material-symbols-outlined text-sm text-amber-500 shrink-0 mt-0.5">sticky_note_2</span>
                                                        <p className="text-[11px] text-amber-800 dark:text-amber-300 line-clamp-2">
                                                            {cut.comments}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex border-t border-gray-100 dark:border-gray-700">
                                                <Link
                                                    to={`/cut-edit/${id}/${cut.id}`}
                                                    className="flex-1 py-2 text-center text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                    編集
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        const newCut = copyCut(id, cut.id);
                                                        if (newCut) {
                                                            navigate(`/cut-edit/${id}/${newCut.id}`);
                                                        }
                                                    }}
                                                    className="flex-1 py-2 text-center text-xs font-medium text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l border-gray-100 dark:border-gray-700 flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                                    コピー
                                                </button>
                                                <button
                                                    onClick={() => setDeletingCutId(cut.id)}
                                                    className="flex-1 py-2 text-center text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-l border-gray-100 dark:border-gray-700 flex items-center justify-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                    削除
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Grid View - more columns on desktop
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                                {filteredCuts.map((cut, index) => {
                                    const originalIndex = project.cuts.findIndex(c => c.id === cut.id);
                                    return (
                                        <Link
                                            key={cut.id}
                                            to={`/cut-edit/${id}/${cut.id}`}
                                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                                        >
                                            {/* Thumbnail */}
                                            <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                                                {cut.aiGeneratedImage || cut.originalImage ? (
                                                    <img
                                                        src={cut.aiGeneratedImage || cut.originalImage}
                                                        alt={cut.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-3xl text-gray-400">image</span>
                                                    </div>
                                                )}
                                                {/* Overlay Info */}
                                                <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                                                    <span className="text-[10px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded">
                                                        #{String(originalIndex + 1).padStart(2, '0')}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleToggleCutStatus(cut.id, cut.status);
                                                        }}
                                                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                            cut.status === 'completed'
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-white/80 dark:bg-gray-800/80'
                                                        }`}
                                                    >
                                                        {cut.status === 'completed' && (
                                                            <span className="material-symbols-outlined text-sm">check</span>
                                                        )}
                                                    </button>
                                                </div>
                                                {/* AI Badge */}
                                                {cut.aiGeneratedImage && (
                                                    <div className="absolute bottom-2 left-2 bg-purple-500 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                        <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                                        AI
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="p-2">
                                                <h3 className="text-xs font-bold truncate">{cut.title}</h3>
                                                {cut.scene && (
                                                    <span className="text-[10px] text-purple-600 dark:text-purple-400">{cut.scene}</span>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            {filterType !== 'all' ? (
                                <>
                                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">filter_alt_off</span>
                                    <p className="text-sm text-gray-500 mb-4">条件に一致するカットがありません</p>
                                    <button
                                        onClick={clearFilter}
                                        className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                                    >
                                        <span className="material-symbols-outlined text-lg">refresh</span>
                                        フィルターをクリア
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">photo_library</span>
                                    <p className="text-sm text-gray-500 mb-4">カットがまだありません</p>
                                    <Link
                                        to={`/cut-add/${id}`}
                                        className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline"
                                    >
                                        <span className="material-symbols-outlined text-lg">add</span>
                                        最初のカットを追加
                                    </Link>
                                </>
                            )}
                        </div>
                    )}
                </section>

                {/* Actions */}
                <section className="space-y-3">
                    <div className="flex gap-3">
                        <Link
                            to={`/prop-checklist/${id}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium text-sm"
                        >
                            <span className="material-symbols-outlined text-primary">inventory_2</span>
                            小物準備
                        </Link>
                        <Link
                            to={`/final-preview/${id}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium text-sm"
                        >
                            <span className="material-symbols-outlined">description</span>
                            指示書
                        </Link>
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-3 text-red-500 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                    >
                        プロジェクトを削除
                    </button>
                </section>
            </main>

            {/* FAB - adjust position for desktop */}
            <Link
                to={`/cut-add/${id}`}
                className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 flex items-center justify-center gap-2 bg-primary text-white h-14 px-5 rounded-full shadow-lg z-40"
            >
                <span className="material-symbols-outlined">add</span>
                <span className="text-sm font-bold">カット追加</span>
            </Link>

            {/* Delete Cut Confirmation */}
            {deletingCutId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full animate-fadeIn">
                        <h3 className="text-lg font-bold mb-2">カットを削除しますか？</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            このカットを削除します。この操作は取り消せません。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingCutId(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleDeleteCut(deletingCutId)}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Project Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full animate-fadeIn">
                        <h3 className="text-lg font-bold mb-2">プロジェクトを削除しますか？</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            「{project.name}」とすべてのカットを削除します。この操作は取り消せません。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Change Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">ステータスを変更</h3>
                            <button
                                onClick={() => setShowStatusModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-2">
                            {[
                                { id: 'draft', label: '下書き', icon: 'edit_note', color: 'text-gray-600', bgColor: 'bg-gray-100', desc: '準備中のプロジェクト' },
                                { id: 'in_progress', label: '進行中', icon: 'play_circle', color: 'text-blue-600', bgColor: 'bg-blue-100', desc: '撮影・編集が進行中' },
                                { id: 'completed', label: '完了', icon: 'check_circle', color: 'text-green-600', bgColor: 'bg-green-100', desc: '全ての作業が完了' },
                            ].map(status => (
                                <button
                                    key={status.id}
                                    onClick={() => {
                                        updateProject(Number(id), { status: status.id });
                                        setShowStatusModal(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                                        project.status === status.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <span className={`material-symbols-outlined text-2xl ${status.color}`}>
                                        {status.icon}
                                    </span>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-sm">{status.label}</p>
                                        <p className="text-[10px] text-gray-500">{status.desc}</p>
                                    </div>
                                    {project.status === status.id && (
                                        <span className="material-symbols-outlined text-primary">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </Layout>
    );
};

export default ProjectDetail;
