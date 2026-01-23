import { useNavigate } from 'react-router-dom';

const Header = ({ title, showBack = true, rightIcon = 'more_vert', subtitle = "" }) => {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center p-4 justify-between max-w-md mx-auto">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button
                            onClick={() => navigate(-1)}
                            className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                        </button>
                    )}
                    <div className="flex flex-col">
                        <h2 className="font-display text-base font-bold leading-tight tracking-tight">{title}</h2>
                        {subtitle && (
                            <span className="text-[10px] uppercase tracking-widest font-bold text-primary">{subtitle}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-2xl">{rightIcon}</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Header;
