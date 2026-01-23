import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';

const ProjectOverview = () => {
    const { projects, getProjectProgress } = useProjects();

    // 設定から完了済みプロジェクトの表示設定を取得
    const getShowCompletedSetting = () => {
        const saved = localStorage.getItem('shooting-master-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            return settings.showCompletedProjects !== false; // デフォルトはtrue
        }
        return true;
    };

    const [showCompleted, setShowCompleted] = useState(getShowCompletedSetting);

    // フィルタリングされたプロジェクト
    const filteredProjects = useMemo(() => {
        if (showCompleted) {
            return projects;
        }
        return projects.filter(p => p.status !== 'completed');
    }, [projects, showCompleted]);

    const completedCount = projects.filter(p => p.status === 'completed').length;

    const statusColors = {
        draft: 'bg-gray-500',
        in_progress: 'bg-blue-500',
        completed: 'bg-green-500',
    };

    const statusLabels = {
        draft: '下書き',
        in_progress: '進行中',
        completed: '完了',
    };

    return (
        <Layout activeNav="project">
        <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8">
            <Header title="撮影プロジェクト" showBack={false} rightIcon="search" />

            <main className="p-4 lg:p-6 space-y-6">
                {/* Stats */}
                <section className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-primary">{projects.length}</p>
                        <p className="text-[10px] text-gray-500 uppercase">全体</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-blue-500">
                            {projects.filter(p => p.status === 'in_progress').length}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">進行中</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-green-500">
                            {projects.filter(p => p.status === 'completed').length}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase">完了</p>
                    </div>
                </section>

                {/* Project List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold">プロジェクト一覧</h2>
                        <div className="flex items-center gap-3">
                            {completedCount > 0 && (
                                <button
                                    onClick={() => setShowCompleted(!showCompleted)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                        showCompleted
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {showCompleted ? 'visibility' : 'visibility_off'}
                                    </span>
                                    完了済み {showCompleted ? '表示中' : '非表示'}
                                </button>
                            )}
                            <span className="text-xs text-gray-500">{filteredProjects.length}件</span>
                        </div>
                    </div>

                    {filteredProjects.length > 0 ? (
                        <div className="space-y-4">
                            {filteredProjects.map(project => {
                                const progress = getProjectProgress(project.id);
                                return (
                                    <Link
                                        key={project.id}
                                        to={`/project-detail/${project.id}`}
                                        className="block bg-surface-dark rounded-2xl overflow-hidden text-white hover:ring-2 hover:ring-primary/50 transition-all"
                                    >
                                        {/* Image */}
                                        {project.productImage && (
                                            <div
                                                className="h-32 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${project.productImage})` }}
                                            />
                                        )}

                                        {/* Content */}
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                                                <span className="text-[10px] text-slate-400">
                                                    {statusLabels[project.status]}
                                                </span>
                                                {project.shootingDate && (
                                                    <>
                                                        <span className="text-slate-600">•</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {project.shootingDate}
                                                        </span>
                                                    </>
                                                )}
                                            </div>

                                            <h3 className="text-lg font-bold mb-1">{project.name}</h3>

                                            {project.description && (
                                                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                                                    {project.description}
                                                </p>
                                            )}

                                            {/* Progress */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-bold text-primary">{progress}%</span>
                                            </div>

                                            <p className="text-[10px] text-slate-500 mt-1">
                                                {project.cuts.length}カット
                                                {project.cuts.length > 0 && (
                                                    <> • {project.cuts.filter(c => c.status === 'completed').length}完了</>
                                                )}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">folder_open</span>
                            {projects.length === 0 ? (
                                <>
                                    <p className="text-gray-500 mb-4">プロジェクトがまだありません</p>
                                    <Link
                                        to="/project-register"
                                        className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                                    >
                                        <span className="material-symbols-outlined">add</span>
                                        最初のプロジェクトを作成
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-500 mb-4">完了済みプロジェクトは非表示です</p>
                                    <button
                                        onClick={() => setShowCompleted(true)}
                                        className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
                                    >
                                        <span className="material-symbols-outlined">visibility</span>
                                        完了済みを表示
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </section>
            </main>

            {/* FAB */}
            <Link
                to="/project-register"
                className="fixed bottom-24 right-6 flex items-center justify-center gap-2 bg-primary text-white h-14 px-6 rounded-full shadow-lg z-40 hover:bg-primary/90 transition-colors"
            >
                <span className="material-symbols-outlined">add</span>
                <span className="text-sm font-bold">新規作成</span>
            </Link>

        </div>
        </Layout>
    );
};

export default ProjectOverview;
