import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BottomNav = ({ active }) => {
    const { canView } = useAuth();

    // 各ナビアイテムと対応する権限ページキー
    const navItems = [
        { id: 'dash', icon: 'dashboard', label: 'ダッシュ', path: '/', permKey: 'dashboard' },
        { id: 'project', icon: 'photo_camera', label: '撮影', path: '/project-overview', permKey: 'projects' },
        { id: 'model', icon: 'person', label: 'モデル', path: '/model-list', permKey: 'models' },
        { id: 'props', icon: 'inventory_2', label: '小物', path: '/prop-checklist', permKey: 'props' },
        { id: 'delivery', icon: 'cloud_upload', label: '納品', path: '/delivery', permKey: 'delivery' },
        { id: 'settings', icon: 'settings', label: '設定', path: '/settings', permKey: 'settings' }
    ];

    // 権限のあるアイテムのみ表示
    const visibleItems = navItems.filter(item => canView(item.permKey));

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 px-4 py-3 pb-8 flex justify-between items-center z-50">
            {visibleItems.map(item => (
                <Link
                    key={item.id}
                    to={item.path}
                    className={`flex flex-col items-center gap-0.5 flex-1 ${active === item.id ? 'text-primary' : 'text-gray-400'}`}
                >
                    <span className={`material-symbols-outlined text-2xl ${active === item.id ? 'fill-1' : ''}`}>
                        {item.icon}
                    </span>
                    <span className="text-[8px] font-bold">{item.label}</span>
                </Link>
            ))}
        </nav>
    );
};

export default BottomNav;
