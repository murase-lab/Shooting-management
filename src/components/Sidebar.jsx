import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const { canView } = useAuth();

    const navItems = [
        { id: 'dash', icon: 'dashboard', label: 'ダッシュボード', path: '/', permKey: 'dashboard' },
        { id: 'project', icon: 'photo_camera', label: '撮影管理', path: '/project-overview', permKey: 'projects' },
        { id: 'model', icon: 'person', label: 'モデル管理', path: '/model-list', permKey: 'models' },
        { id: 'props', icon: 'inventory_2', label: '小物管理', path: '/prop-checklist', permKey: 'props' },
        { id: 'delivery', icon: 'cloud_upload', label: '納品管理', path: '/delivery', permKey: 'delivery' },
        { id: 'settings', icon: 'settings', label: '設定', path: '/settings', permKey: 'settings' }
    ];

    const visibleItems = navItems.filter(item => canView(item.permKey));

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen fixed left-0 top-0 z-40">
            {/* ロゴ */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <Link to="/" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Shooting Master</h1>
                        <p className="text-[10px] text-gray-500 -mt-0.5">撮影管理アプリ</p>
                    </div>
                </Link>
            </div>

            {/* ナビゲーション */}
            <nav className="flex-1 p-4 space-y-1">
                {visibleItems.map(item => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                active
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-xl ${active ? 'fill-1' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* フッター */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 text-center">v1.0.0</p>
            </div>
        </aside>
    );
};

export default Sidebar;
