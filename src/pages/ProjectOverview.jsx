import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';

const ProjectOverview = () => {
    const navigate = useNavigate();
    const { projects, getProjectProgress, deleteProject, copyProject } = useProjects();
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

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

    const handleMenuToggle = (e, projectId) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenId(menuOpenId === projectId ? null : projectId);
    };

    const handleEdit = (e, projectId) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenId(null);
        navigate(`/project-register?edit=${projectId}`);
    };

    const handleCopy = async (e, projectId) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenId(null);
        const newProject = await copyProject(projectId);
        if (newProject) {
            // コピーしたプロジェクトの編集画面に遷移
            navigate(`/project-register?edit=${newProject.id}`);
        }
    };

    const handleDeleteClick = (e, projectId) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenId(null);
        setDeleteConfirmId(projectId);
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirmId) {
            deleteProject(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    // メニュー外クリックで閉じる
    const handleBackdropClick = () => {
        setMenuOpenId(null);
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
                                const isMenuOpen = menuOpenId === project.id;
                                return (
                                    <div key={project.id} className="relative">
                                        <Link
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

                                                <h3 className="text-lg font-bold mb-1 pr-10">{project.name}</h3>

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

                                        {/* メニューボタン */}
                                        <button
                                            onClick={(e) => handleMenuToggle(e, project.id)}
                                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition-colors z-10"
                                        >
                                            <span className="material-symbols-outlined text-white text-xl">more_vert</span>
                                        </button>

                                        {/* ドロップダウンメニュー */}
                                        {isMenuOpen && (
                                            <div className="absolute top-14 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20 min-w-[140px]">
                                                <button
                                                    onClick={(e) => handleEdit(e, project.id)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg text-blue-500">edit</span>
                                                    編集
                                                </button>
                                                <button
                                                    onClick={(e) => handleCopy(e, project.id)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg text-green-500">content_copy</span>
                                                    コピー
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteClick(e, project.id)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                    削除
                                                </button>
                                            </div>
                                        )}
                                    </div>
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

            {/* メニュー背景（クリックで閉じる） */}
            {menuOpenId && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={handleBackdropClick}
                />
            )}

            {/* 削除確認モーダル */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold mb-2">プロジェクトを削除しますか？</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            このプロジェクトとすべてのカット・小物を削除します。この操作は取り消せません。
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold"
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

export default ProjectOverview;
