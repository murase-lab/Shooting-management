import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';
import { ensureImageSize } from '../utils/imageCompressor';

const CATEGORIES = {
    product: { label: '撮影商品', icon: 'inventory_2', color: 'text-blue-500' },
    prop: { label: '小物・備品', icon: 'chair', color: 'text-amber-500' },
    costume: { label: 'モデル衣装', icon: 'checkroom', color: 'text-pink-500' },
};

const PropChecklist = () => {
    const { projectId } = useParams();
    const { projects, getProjectById, togglePropCheck, addProp, updateProp, deleteProp, getCutsUsingProp } = useProjects();
    const fileInputRef = useRef(null);
    const editFileInputRef = useRef(null);

    const [selectedProject, setSelectedProject] = useState(projectId || (projects[0]?.id || null));
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'product', 'prop', 'costume'
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(null); // propIdを保持
    const [showDeleteModal, setShowDeleteModal] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [newProp, setNewProp] = useState({
        name: '',
        category: 'product',
        notes: '',
        image: '',
    });
    const [editProp, setEditProp] = useState({
        name: '',
        category: 'product',
        notes: '',
        image: '',
    });

    const project = getProjectById(selectedProject);
    const props = project?.props || [];

    // カテゴリでフィルタリング
    const filteredProps = activeTab === 'all'
        ? props
        : props.filter(p => p.category === activeTab);

    // 全体の進捗
    const totalProgress = props.length > 0
        ? Math.round((props.filter(p => p.checked).length / props.length) * 100)
        : 0;

    const handleToggle = (propId) => {
        if (selectedProject) {
            togglePropCheck(selectedProject, propId);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                // 画像を100KB以下に圧縮
                const compressed = await ensureImageSize(reader.result, 100);
                setNewProp(prev => ({ ...prev, image: compressed }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                // 画像を100KB以下に圧縮
                const compressed = await ensureImageSize(reader.result, 100);
                setEditProp(prev => ({ ...prev, image: compressed }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddProp = () => {
        if (!newProp.name.trim() || !selectedProject) return;
        addProp(selectedProject, newProp);
        setNewProp({ name: '', category: 'product', notes: '', image: '' });
        setShowAddModal(false);
    };

    const handleOpenEdit = (prop) => {
        setEditProp({
            name: prop.name,
            category: prop.category,
            notes: prop.notes || '',
            image: prop.image || '',
        });
        setShowEditModal(prop.id);
    };

    const handleUpdateProp = () => {
        if (!editProp.name.trim() || !selectedProject || !showEditModal) return;
        updateProp(selectedProject, showEditModal, editProp);
        setShowEditModal(null);
    };

    const handleDeleteProp = (propId) => {
        if (selectedProject) {
            deleteProp(selectedProject, propId);
            setShowDeleteModal(null);
        }
    };

    // カットで使用されている商品名を抽出（propsに未登録のもの）
    const getUnregisteredProductsFromCuts = () => {
        if (!project || !project.cuts) return [];

        const existingPropNames = props.map(p => p.name.toLowerCase());
        const productsFromCuts = new Set();

        project.cuts.forEach(cut => {
            // カットの商品名やタイトルから商品を抽出
            if (cut.productName && !existingPropNames.includes(cut.productName.toLowerCase())) {
                productsFromCuts.add(cut.productName);
            }
            // カットで使用している商品情報があれば追加
            if (cut.products && Array.isArray(cut.products)) {
                cut.products.forEach(productName => {
                    if (!existingPropNames.includes(productName.toLowerCase())) {
                        productsFromCuts.add(productName);
                    }
                });
            }
        });

        return Array.from(productsFromCuts);
    };

    // 既存のカットに紐づいている商品（prop）を取得
    const getProductsLinkedToCuts = () => {
        if (!project || !project.cuts) return [];

        const linkedPropIds = new Set();
        project.cuts.forEach(cut => {
            if (cut.propIds && Array.isArray(cut.propIds)) {
                cut.propIds.forEach(propId => linkedPropIds.add(propId));
            }
        });

        return props.filter(p => p.category === 'product' && linkedPropIds.has(p.id));
    };

    // カットに紐づいていない商品（prop）を取得
    const getProductsNotLinkedToCuts = () => {
        if (!project || !project.cuts) return props.filter(p => p.category === 'product');

        const linkedPropIds = new Set();
        project.cuts.forEach(cut => {
            if (cut.propIds && Array.isArray(cut.propIds)) {
                cut.propIds.forEach(propId => linkedPropIds.add(propId));
            }
        });

        return props.filter(p => p.category === 'product' && !linkedPropIds.has(p.id));
    };

    const linkedProducts = getProductsLinkedToCuts();
    const unlinkedProducts = getProductsNotLinkedToCuts();

    return (
        <Layout activeNav="props">
        <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8 bg-background-light dark:bg-background-dark">
            <Header title="商品・小物準備" showBack={false} />

            <main className="p-4 lg:p-6">
                {/* Project Selector */}
                <div className="mb-4">
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

                {project ? (
                    <>
                        {/* Progress Overview */}
                        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-bold">準備進捗</span>
                                <span className="text-lg font-bold text-primary">{totalProgress}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${totalProgress}%` }}
                                />
                            </div>

                            {/* Category Progress */}
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(CATEGORIES).map(([key, cat]) => {
                                    const categoryCount = props.filter(p => p.category === key).length;
                                    const checkedCount = props.filter(p => p.category === key && p.checked).length;
                                    return (
                                        <div key={key} className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <span className={`material-symbols-outlined text-lg ${cat.color}`}>{cat.icon}</span>
                                            <p className="text-[10px] text-gray-500 mt-1">{cat.label}</p>
                                            <p className="text-xs font-bold">{checkedCount}/{categoryCount}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* カットとの連携情報 */}
                        {props.filter(p => p.category === 'product').length > 0 && (
                            <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-blue-500">inventory_2</span>
                                        撮影商品とカットの連携
                                    </h4>
                                    <Link
                                        to={`/project-detail/${selectedProject}`}
                                        className="text-xs text-primary font-medium flex items-center gap-1"
                                    >
                                        カット一覧
                                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-sm text-green-600">link</span>
                                            <span className="text-xs text-green-700 dark:text-green-400 font-medium">カットに連携済み</span>
                                        </div>
                                        <p className="text-xl font-bold text-green-600">{linkedProducts.length}<span className="text-xs ml-1">商品</span></p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-sm text-amber-600">link_off</span>
                                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">未連携</span>
                                        </div>
                                        <p className="text-xl font-bold text-amber-600">{unlinkedProducts.length}<span className="text-xs ml-1">商品</span></p>
                                    </div>
                                </div>
                                {unlinkedProducts.length > 0 && (
                                    <p className="mt-3 text-[10px] text-gray-500">
                                        💡 未連携の商品は、カット編集画面で「使用商品」として設定できます
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Category Tabs */}
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    activeTab === 'all'
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                すべて ({props.length})
                            </button>
                            {Object.entries(CATEGORIES).map(([key, cat]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                                        activeTab === key
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    <span className={`material-symbols-outlined text-sm ${activeTab === key ? '' : cat.color}`}>
                                        {cat.icon}
                                    </span>
                                    {cat.label} ({props.filter(p => p.category === key).length})
                                </button>
                            ))}
                        </div>

                        {/* Props List */}
                        {filteredProps.length > 0 ? (
                            <div className="space-y-3">
                                {filteredProps.map(item => (
                                    <div
                                        key={item.id}
                                        className={`bg-white dark:bg-gray-900 rounded-xl p-3 border shadow-sm flex gap-3 items-center transition-all ${
                                            item.checked ? 'border-primary/30 bg-primary/5' : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {/* Image or Icon */}
                                        <div className="size-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    className="w-full h-full object-cover"
                                                    alt={item.name}
                                                />
                                            ) : (
                                                <span className={`material-symbols-outlined text-2xl ${CATEGORIES[item.category]?.color || 'text-gray-400'}`}>
                                                    {CATEGORIES[item.category]?.icon || 'inventory_2'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                    item.category === 'product' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    item.category === 'costume' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                    {CATEGORIES[item.category]?.label || '小物'}
                                                </span>
                                            </div>
                                            <h3 className={`text-sm font-bold truncate ${item.checked ? 'line-through text-gray-400' : ''}`}>
                                                {item.name}
                                            </h3>
                                            {item.notes && (
                                                <p className="text-[11px] text-gray-500 truncate">{item.notes}</p>
                                            )}
                                            {/* 使用カット表示 */}
                                            {(() => {
                                                const usingCuts = getCutsUsingProp(selectedProject, item.id);
                                                if (usingCuts.length > 0) {
                                                    return (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="material-symbols-outlined text-xs text-green-500">link</span>
                                                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                                                {usingCuts.length}カットで使用中
                                                            </span>
                                                        </div>
                                                    );
                                                } else if (item.category === 'product') {
                                                    return (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="material-symbols-outlined text-xs text-amber-500">link_off</span>
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                                                カット未設定
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenEdit(item)}
                                                className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteModal(item.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={() => handleToggle(item.id)}
                                                className="size-6 rounded border-gray-300 text-primary cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inventory_2</span>
                                <p className="text-sm text-gray-400 mb-4">
                                    {activeTab === 'all' ? 'アイテムがありません' : `${CATEGORIES[activeTab]?.label}がありません`}
                                </p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    追加する
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">folder_off</span>
                        <p className="text-sm text-gray-400 mb-4">プロジェクトを選択してください</p>
                        <Link
                            to="/project-register"
                            className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            新規プロジェクト作成
                        </Link>
                    </div>
                )}
            </main>

            {/* FAB - Add Button */}
            {project && (
                <button
                    onClick={() => setShowAddModal(true)}
                    className="fixed right-4 bottom-24 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40"
                >
                    <span className="material-symbols-outlined text-2xl">add</span>
                </button>
            )}

            {/* Add Modal - Full Screen */}
            {showAddModal && (
                <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-white dark:bg-gray-900 z-[100] flex flex-col min-h-screen">
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                        <button onClick={() => setShowAddModal(false)} className="p-2 -ml-2">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h3 className="text-lg font-bold">アイテムを追加</h3>
                        <div className="w-10"></div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Image Upload */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">画像（任意）</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-primary transition-colors overflow-hidden"
                            >
                                {newProp.image ? (
                                    <img src={newProp.image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-2xl text-gray-400">add_photo_alternate</span>
                                        <span className="text-xs text-gray-400 mt-1">タップして選択</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">カテゴリ</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <button
                                        key={key}
                                        onClick={() => setNewProp(prev => ({ ...prev, category: key }))}
                                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
                                            newProp.category === key
                                                ? 'border-primary bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined ${cat.color}`}>{cat.icon}</span>
                                        <span className="text-xs">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">名前 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={newProp.name}
                                onChange={(e) => setNewProp(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                                placeholder="アイテム名を入力"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">メモ</label>
                            <textarea
                                value={newProp.notes}
                                onChange={(e) => setNewProp(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 min-h-[80px] resize-none"
                                placeholder="サイズや色など詳細を入力..."
                            />
                        </div>
                    </div>

                    {/* Submit Button - Always visible at bottom */}
                    <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleAddProp}
                            disabled={!newProp.name.trim()}
                            className="w-full py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-lg"
                        >
                            <span className="material-symbols-outlined">add</span>
                            追加する
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal - Full Screen */}
            {showEditModal && (
                <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-white dark:bg-gray-900 z-[100] flex flex-col min-h-screen">
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                        <button onClick={() => setShowEditModal(null)} className="p-2 -ml-2">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h3 className="text-lg font-bold">アイテムを編集</h3>
                        <div className="w-10"></div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Image Upload */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">画像（任意）</label>
                            <input
                                ref={editFileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleEditImageUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => editFileInputRef.current?.click()}
                                className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-primary transition-colors overflow-hidden"
                            >
                                {editProp.image ? (
                                    <img src={editProp.image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-2xl text-gray-400">add_photo_alternate</span>
                                        <span className="text-xs text-gray-400 mt-1">タップして選択</span>
                                    </>
                                )}
                            </button>
                            {editProp.image && (
                                <button
                                    onClick={() => setEditProp(prev => ({ ...prev, image: '' }))}
                                    className="mt-2 text-xs text-red-500 flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    画像を削除
                                </button>
                            )}
                        </div>

                        {/* Category */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">カテゴリ</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(CATEGORIES).map(([key, cat]) => (
                                    <button
                                        key={key}
                                        onClick={() => setEditProp(prev => ({ ...prev, category: key }))}
                                        className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors ${
                                            editProp.category === key
                                                ? 'border-primary bg-primary/10'
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        <span className={`material-symbols-outlined ${cat.color}`}>{cat.icon}</span>
                                        <span className="text-xs">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">名前 <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={editProp.name}
                                onChange={(e) => setEditProp(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark h-12 px-4"
                                placeholder="アイテム名を入力"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">メモ</label>
                            <textarea
                                value={editProp.notes}
                                onChange={(e) => setEditProp(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark p-4 min-h-[80px] resize-none"
                                placeholder="サイズや色など詳細を入力..."
                            />
                        </div>
                    </div>

                    {/* Submit Button - Always visible at bottom */}
                    <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleUpdateProp}
                            disabled={!editProp.name.trim()}
                            className="w-full py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-lg"
                        >
                            <span className="material-symbols-outlined">save</span>
                            保存する
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                        <div className="text-center mb-6">
                            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">delete</span>
                            <h3 className="text-lg font-bold mb-2">削除しますか？</h3>
                            <p className="text-sm text-gray-500">このアイテムを削除します。この操作は取り消せません。</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(null)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleDeleteProp(showDeleteModal)}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
        </Layout>
    );
};

export default PropChecklist;
