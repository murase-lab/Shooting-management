import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Layout from '../components/Layout';
import { useProjects } from '../context/ProjectContext';
import { useModels } from '../context/ModelContext';

const Dashboard = () => {
    const { projects, getProjectProgress, getDeliveryProgress, getPropsProgress, getModelIdsForProject } = useProjects();
    const { models } = useModels();

    // 直近の撮影予定（日付順）
    const upcomingProjects = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return projects
            .filter(p => p.shootingDate && p.shootingDate >= today && p.status !== 'completed')
            .sort((a, b) => a.shootingDate.localeCompare(b.shootingDate))
            .slice(0, 3);
    }, [projects]);

    // 進行中のプロジェクト
    const activeProjects = useMemo(() => {
        return projects.filter(p => p.status === 'in_progress');
    }, [projects]);

    // 全体の納品状況
    const totalDeliveryStats = useMemo(() => {
        let total = 0, approved = 0, uploaded = 0, revisionRequested = 0, pending = 0;
        projects.forEach(p => {
            const stats = getDeliveryProgress(p.id);
            total += stats.total;
            approved += stats.approved;
            uploaded += stats.uploaded;
            revisionRequested += stats.revisionRequested;
            pending += stats.pending;
        });
        return { total, approved, uploaded, revisionRequested, pending };
    }, [projects, getDeliveryProgress]);

    // アラート（未準備の小物、修正依頼など）
    const alerts = useMemo(() => {
        const items = [];

        // 修正依頼中の商品
        projects.forEach(p => {
            const products = (p.props || []).filter(prop => prop.category === 'product' && prop.delivery?.status === 'revision_requested');
            if (products.length > 0) {
                items.push({
                    type: 'revision',
                    icon: 'edit_note',
                    message: `${p.name}: 修正依頼 ${products.length}件`,
                    link: `/delivery/${p.id}`,
                    priority: 'high',
                });
            }
        });

        // 未準備の小物
        projects.forEach(p => {
            if (p.status === 'completed') return;
            const uncheckedProps = (p.props || []).filter(prop => !prop.checked);
            if (uncheckedProps.length > 0) {
                items.push({
                    type: 'props',
                    icon: 'inventory_2',
                    message: `${p.name}: 未準備アイテム ${uncheckedProps.length}点`,
                    link: `/prop-checklist/${p.id}`,
                    priority: 'medium',
                });
            }
        });

        // 納品待ちの商品
        projects.forEach(p => {
            const stats = getDeliveryProgress(p.id);
            if (stats.pending > 0 && p.status === 'in_progress') {
                items.push({
                    type: 'pending',
                    icon: 'schedule',
                    message: `${p.name}: 納品待ち ${stats.pending}件`,
                    link: `/delivery/${p.id}`,
                    priority: 'low',
                });
            }
        });

        return items.slice(0, 5);
    }, [projects, getDeliveryProgress]);

    // 日付フォーマット
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        return `${month}/${day}(${weekday})`;
    };

    // 撮影日までの日数
    const getDaysUntil = (dateStr) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        if (diff === 0) return '今日';
        if (diff === 1) return '明日';
        if (diff < 0) return '過去';
        return `${diff}日後`;
    };

    return (
        <Layout activeNav="dash">
            <div className="max-w-md lg:max-w-6xl mx-auto min-h-screen pb-32 lg:pb-8">
                <Header title="ダッシュボード" showBack={false} rightIcon="notifications" />

                <main className="p-4 lg:p-6 space-y-5 lg:space-y-6">
                {/* 全体サマリー */}
                <section className="bg-gradient-to-br from-primary to-purple-600 rounded-2xl p-5 lg:p-6 text-white">
                    <h2 className="text-sm lg:text-base font-medium opacity-80 mb-3 lg:mb-4">プロジェクト概要</h2>
                    <div className="grid grid-cols-4 gap-3 lg:gap-6">
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold">{projects.length}</p>
                            <p className="text-[9px] lg:text-sm opacity-70">プロジェクト</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold">{activeProjects.length}</p>
                            <p className="text-[9px] lg:text-sm opacity-70">進行中</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold">{projects.reduce((sum, p) => sum + p.cuts.length, 0)}</p>
                            <p className="text-[9px] lg:text-sm opacity-70">総カット</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl lg:text-4xl font-bold">{models.length}</p>
                            <p className="text-[9px] lg:text-sm opacity-70">モデル</p>
                        </div>
                    </div>
                </section>

                {/* 納品状況 */}
                {totalDeliveryStats.total > 0 && (
                    <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">cloud_upload</span>
                                納品状況
                            </h3>
                            <Link to="/delivery" className="text-xs text-primary font-medium">詳細</Link>
                        </div>

                        {/* 進捗バー */}
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex mb-3">
                            <div
                                className="bg-green-500 transition-all"
                                style={{ width: `${(totalDeliveryStats.approved / totalDeliveryStats.total) * 100}%` }}
                            />
                            <div
                                className="bg-blue-500 transition-all"
                                style={{ width: `${(totalDeliveryStats.uploaded / totalDeliveryStats.total) * 100}%` }}
                            />
                            <div
                                className="bg-red-500 transition-all"
                                style={{ width: `${(totalDeliveryStats.revisionRequested / totalDeliveryStats.total) * 100}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold text-green-600">{totalDeliveryStats.approved}</p>
                                <p className="text-[9px] text-gray-400">確認済</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-blue-600">{totalDeliveryStats.uploaded}</p>
                                <p className="text-[9px] text-gray-400">納品済</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-red-600">{totalDeliveryStats.revisionRequested}</p>
                                <p className="text-[9px] text-gray-400">修正依頼</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-gray-400">{totalDeliveryStats.pending}</p>
                                <p className="text-[9px] text-gray-400">未納品</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* アラート */}
                {alerts.length > 0 && (
                    <section className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-amber-600 text-lg">notifications_active</span>
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">確認が必要</h3>
                        </div>
                        <div className="space-y-2">
                            {alerts.map((alert, idx) => (
                                <Link
                                    key={idx}
                                    to={alert.link}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                                        alert.priority === 'high'
                                            ? 'bg-red-100 dark:bg-red-900/30'
                                            : alert.priority === 'medium'
                                            ? 'bg-amber-100 dark:bg-amber-900/30'
                                            : 'bg-white/70 dark:bg-black/20'
                                    }`}
                                >
                                    <span className={`material-symbols-outlined text-lg ${
                                        alert.priority === 'high' ? 'text-red-500' :
                                        alert.priority === 'medium' ? 'text-amber-600' : 'text-gray-500'
                                    }`}>
                                        {alert.icon}
                                    </span>
                                    <span className="text-xs flex-1">{alert.message}</span>
                                    <span className="material-symbols-outlined text-gray-400 text-sm">chevron_right</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* 直近の撮影予定 */}
                {upcomingProjects.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">calendar_month</span>
                                直近の撮影予定
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {upcomingProjects.map(project => {
                                const progress = getProjectProgress(project.id);
                                const propsProgress = getPropsProgress(project.id);
                                const daysUntil = getDaysUntil(project.shootingDate);
                                const isUrgent = daysUntil === '今日' || daysUntil === '明日';

                                return (
                                    <Link
                                        key={project.id}
                                        to={`/project-detail/${project.id}`}
                                        className="block bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                        isUrgent
                                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-primary/10 text-primary'
                                                    }`}>
                                                        {daysUntil}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{formatDate(project.shootingDate)}</span>
                                                </div>
                                                <h4 className="text-sm font-bold truncate">{project.name}</h4>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <p className="text-lg font-bold text-primary">{progress}%</p>
                                                <p className="text-[9px] text-gray-400">撮影進捗</p>
                                            </div>
                                        </div>

                                        {/* ミニ進捗 */}
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden flex-1">
                                                    <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    {project.cuts.filter(c => c.status === 'completed').length}/{project.cuts.length}カット
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden flex-1">
                                                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${propsProgress}%` }} />
                                                </div>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    小物{propsProgress}%
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 進行中のプロジェクト */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg text-primary">photo_camera</span>
                            進行中のプロジェクト
                        </h3>
                        <Link to="/project-overview" className="text-xs text-primary font-medium">すべて表示</Link>
                    </div>

                    {activeProjects.length > 0 ? (
                        <div className="space-y-3">
                            {activeProjects.slice(0, 3).map(project => {
                                const progress = getProjectProgress(project.id);
                                const deliveryStats = getDeliveryProgress(project.id);

                                return (
                                    <Link
                                        key={project.id}
                                        to={`/project-detail/${project.id}`}
                                        className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700"
                                    >
                                        {/* サムネイル */}
                                        <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                                            {project.productImage ? (
                                                <img src={project.productImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-gray-400">photo_camera</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 情報 */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold truncate">{project.name}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-gray-400">{project.cuts.length}カット</span>
                                                {deliveryStats.total > 0 && (
                                                    <span className="text-[10px] text-blue-500">
                                                        納品 {deliveryStats.approved + deliveryStats.uploaded}/{deliveryStats.total}
                                                    </span>
                                                )}
                                            </div>
                                            {/* 進捗バー */}
                                            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className="bg-primary h-full transition-all" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>

                                        {/* 進捗 */}
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-bold text-primary">{progress}%</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">folder_open</span>
                            <p className="text-sm text-gray-400 mb-3">進行中のプロジェクトがありません</p>
                            <Link
                                to="/project-register"
                                className="inline-flex items-center gap-2 text-primary font-bold text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                新規作成
                            </Link>
                        </div>
                    )}
                </section>

                {/* クイックアクション */}
                <section>
                    <h3 className="text-sm lg:text-base font-bold mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-primary">bolt</span>
                        クイックアクション
                    </h3>
                    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 lg:gap-3">
                        <Link
                            to="/project-register"
                            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
                            </div>
                            <span className="text-[10px] font-medium">新規PJ</span>
                        </Link>
                        <Link
                            to="/model-list"
                            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-pink-500 text-xl">person</span>
                            </div>
                            <span className="text-[10px] font-medium">モデル</span>
                        </Link>
                        <Link
                            to="/delivery"
                            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-500 text-xl">cloud_upload</span>
                            </div>
                            <span className="text-[10px] font-medium">納品確認</span>
                        </Link>
                        <Link
                            to="/prop-checklist"
                            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-500 text-xl">inventory_2</span>
                            </div>
                            <span className="text-[10px] font-medium">小物準備</span>
                        </Link>
                        <Link
                            to="/project-overview"
                            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-500 text-xl">description</span>
                            </div>
                            <span className="text-[10px] font-medium">指示書</span>
                        </Link>
                        <Link
                            to="/settings"
                            className="flex flex-col items-center gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                        >
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <span className="material-symbols-outlined text-gray-500 text-xl">settings</span>
                            </div>
                            <span className="text-[10px] font-medium">設定</span>
                        </Link>
                    </div>
                </section>
            </main>
            </div>
        </Layout>
    );
};

export default Dashboard;
