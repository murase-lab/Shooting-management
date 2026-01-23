import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

/**
 * レスポンシブレイアウトコンポーネント
 * - モバイル: ボトムナビゲーション
 * - PC/タブレット(lg以上): サイドバー
 */
const Layout = ({ children, activeNav, showNav = true }) => {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* PC用サイドバー */}
            {showNav && <Sidebar />}

            {/* メインコンテンツ */}
            <main className={`${showNav ? 'lg:ml-64' : ''}`}>
                {children}
            </main>

            {/* モバイル用ボトムナビ */}
            {showNav && (
                <div className="lg:hidden">
                    <BottomNav active={activeNav} />
                </div>
            )}
        </div>
    );
};

export default Layout;
