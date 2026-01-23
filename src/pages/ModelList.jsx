import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useModels } from '../context/ModelContext';

const ModelList = () => {
    const { models } = useModels();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all', 'agency', 'freelance'

    const filteredModels = models.filter(model => {
        const matchesSearch =
            model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (model.agencyName && model.agencyName.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFilter =
            filterType === 'all' ||
            (filterType === 'agency' && model.modelType === 'agency') ||
            (filterType === 'freelance' && model.modelType === 'freelance');

        return matchesSearch && matchesFilter;
    });

    return (
        <Layout activeNav="model">
        <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8">
            <Header title="モデル名簿" showBack={false} />

            {/* Search */}
            <div className="px-4 pb-3">
                <div className="relative flex items-center group">
                    <span className="material-symbols-outlined absolute left-3 text-gray-400">search</span>
                    <input
                        className="w-full h-11 pl-10 pr-4 bg-white dark:bg-[#232b29] border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400"
                        placeholder="モデル名・事務所名で検索..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-4 pb-4">
                <div className="flex gap-2">
                    {[
                        { id: 'all', label: 'すべて' },
                        { id: 'agency', label: '事務所所属' },
                        { id: 'freelance', label: 'フリーランス' },
                    ].map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => setFilterType(filter.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                filterType === filter.id
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="px-4 pb-4">
                <p className="text-xs text-gray-500">
                    {filteredModels.length}名のモデル
                    {filterType !== 'all' && ` (${filterType === 'agency' ? '事務所所属' : 'フリーランス'})`}
                </p>
            </div>

            {/* Model Grid */}
            <main className="px-4 lg:p-6 grid grid-cols-2 gap-4">
                {filteredModels.length > 0 ? (
                    filteredModels.map(model => (
                        <Link
                            to={`/model-detail/${model.id}`}
                            key={model.id}
                            className="flex flex-col bg-white dark:bg-[#1c2422] rounded-xl overflow-hidden shadow-sm border border-gray-50 dark:border-gray-700 hover:shadow-md transition-shadow"
                        >
                            <div
                                className="aspect-[3/4] bg-cover bg-center bg-gray-200 dark:bg-gray-700"
                                style={{ backgroundImage: model.image ? `url(${model.image})` : 'none' }}
                            >
                                {!model.image && (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-gray-400">person</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-bold text-sm truncate">{model.name}</h3>
                                <p className="text-[10px] text-gray-500 truncate">
                                    {model.modelType === 'agency' ? model.agencyName : 'フリーランス'}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">{model.height ? `${model.height}cm` : '-'}</span>
                                    {model.instagramUrl && (
                                        <span className="material-symbols-outlined text-pink-400 text-sm">photo_camera</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-2 text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">search_off</span>
                        <p className="text-sm text-gray-400">該当するモデルが見つかりません</p>
                        <Link
                            to="/model-register"
                            className="inline-block mt-4 text-primary text-sm font-bold hover:underline"
                        >
                            新しいモデルを登録する
                        </Link>
                    </div>
                )}
            </main>

            {/* FAB */}
            <Link
                to="/model-register"
                className="fixed bottom-24 right-6 flex items-center justify-center gap-2 bg-primary text-white h-14 px-6 rounded-full shadow-lg z-40 hover:bg-primary/90 transition-colors"
            >
                <span className="material-symbols-outlined">add</span>
                <span className="text-sm font-bold">新規登録</span>
            </Link>

        </div>
        </Layout>
    );
};

export default ModelList;
