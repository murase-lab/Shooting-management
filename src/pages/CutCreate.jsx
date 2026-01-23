import { Link } from 'react-router-dom';
import Header from '../components/Header';

const CutCreate = () => (
    <div className="max-w-md mx-auto min-h-screen pb-32">
        <Header title="新規カット指示作成" subtitle="Scene 02: Beach Side" />
        <main className="p-4 space-y-6">
            <section className="space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="flex items-center justify-center bg-primary text-white text-xs w-5 h-5 rounded-full">1</span>
                    ラフショット & AIコンプ
                </h2>
                <div className="bg-surface-dark rounded-xl overflow-hidden border border-slate-800 shadow-xl">
                    <div
                        className="aspect-[4/3] bg-cover bg-center"
                        style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuCFgeArq0YA2luPcv9T-9xUaU9M0dLIxZZkObTkKXMWiAG6nJOqUcXuh6LfmeAW_zMk0mhiKHG473ckXN6gLQOEq8pRtX--v7DlMvtY8nHZ9Kye_6ohskb9AphCXODCmv6JXwYoXRxX7jddgUq8lwWksbegMbw4m0NEUgD2P83gy19MF0CrYWJMaYSpntgYX1Jk4fzmXDjLI_7Sq95jypJZcs2FwmCI6gyjFC6eGrKOVMWsLBHa8_9UbSM-bNpe-qNT7r21Ubgi-f_F)' }}
                    ></div>
                    <div className="p-4 flex gap-2">
                        <button className="flex-1 bg-primary text-white py-3 rounded-lg font-bold">AIカンプ生成</button>
                    </div>
                </div>
            </section>
            <section className="space-y-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <span className="flex items-center justify-center bg-primary text-white text-xs w-5 h-5 rounded-full">2</span>
                    音声で指示を作成
                </h2>
                <div className="bg-surface-dark rounded-xl p-5 border border-slate-800 shadow-lg flex flex-col items-center">
                    <button className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
                        <span className="material-symbols-outlined text-3xl text-white">mic</span>
                    </button>
                    <p className="mt-4 text-xs font-bold text-slate-400">タップして録音開始</p>
                </div>
            </section>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t z-50">
            <Link to="/rough-adjust" className="w-full flex items-center justify-center bg-primary text-white py-4 rounded-xl font-bold shadow-lg">
                次へ：調整
            </Link>
        </footer>
    </div>
);

export default CutCreate;
