import { Link } from 'react-router-dom';
import Header from '../components/Header';

const CutDetail = () => (
    <div className="max-w-md mx-auto min-h-screen pb-32">
        <Header title="カット指示詳細" subtitle="プロジェクト: ブルーム・スキンケア" />
        <main>
            <header className="px-4 pt-6 pb-2">
                <div className="inline-block px-2 py-0.5 mb-2 bg-accent-sand/20 text-[#8a7e72] text-[10px] font-bold rounded uppercase">シーン 04</div>
                <h1 className="font-display text-2xl font-bold leading-tight">SH-004: 主力製品のクローズアップ</h1>
            </header>
            <section className="px-4 py-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-primary text-xl">camera_outdoor</span>
                        <h3 className="font-display text-lg font-bold">シーン説明</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        製品の質感を強調し、ラベルを鮮明に捉える詳細なマクロ撮影。45度のサイドライティングを使用し、高級感のある雰囲気を目指します。
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">アングル</p>
                            <p className="text-xs font-semibold">ローアングル・マクロ</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">ライティング</p>
                            <p className="text-xs font-semibold">ソフト・サイドライト</p>
                        </div>
                    </div>
                </div>
            </section>
            <section className="py-4">
                <div className="flex items-center justify-between px-4 mb-3">
                    <h3 className="font-display text-lg font-bold">参考画像</h3>
                    <span className="text-xs text-primary font-bold">すべて見る</span>
                </div>
                <div className="flex overflow-x-auto gap-4 px-4 no-scrollbar pb-2">
                    <div className="flex-none w-48 aspect-[3/4] rounded-xl overflow-hidden shadow-md relative group">
                        <img
                            className="w-full h-full object-cover"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJ9-UmxqW9L5S0kmnTEaHOxukjWv3SrDEFplqR6HT2VFdRJFS-YwmbWwbdXYtDduGUu4u_0xoUGCaNlUOUrPxH3NEWOeLZ5eqTyca8LGaPDBaKwDq7XtZNCgpOdOkDsSXBvshGVp8mdUsFbAJ6sYOVSiqCMCqU_im8nviIpfnuMkSAJM3_wzcy4lQuLwrkgHKuM1SyTgpEzvyuhvlzgs0qGs9rNr0yl_38vb4O9FLGM0iSMp-js-9tEoJPaDc7t38f352fhZXk5oox"
                            alt="Reference"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm text-[10px] text-white rounded">テクスチャ参考</div>
                    </div>
                </div>
            </section>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-100 flex justify-center z-50">
            <div className="max-w-md w-full flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl border-2 border-gray-100 text-sm font-bold">コメント</button>
                <Link to="/shot-checklist" className="flex-[2] flex items-center justify-center gap-2 h-14 rounded-xl bg-primary text-white text-sm font-bold shadow-lg">
                    撮影済みにする
                </Link>
            </div>
        </footer>
    </div>
);

export default CutDetail;
