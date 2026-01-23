import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

const RoughAdjust = () => {
    const [activeTab, setActiveTab] = useState('ai');

    const images = {
        rough: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFgeArq0YA2luPcv9T-9xUaU9M0dLIxZZkObTkKXMWiAG6nJOqUcXuh6LfmeAW_zMk0mhiKHG473ckXN6gLQOEq8pRtX--v7DlMvtY8nHZ9Kye_6ohskb9AphCXODCmv6JXwYoXRxX7jddgUq8lwWksbegMbw4m0NEUgD2P83gy19MF0CrYWJMaYSpntgYX1Jk4fzmXDjLI_7Sq95jypJZcs2FwmCI6gyjFC6eGrKOVMWsLBHa8_9UbSM-bNpe-qNT7r21Ubgi-f_F',
        ai: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhhGrvcPXI2Ftery50V8dyGcNp2EEE3Zs2AGthrkK119jAbcMVrtGqGWAAxYKFav_kWbvXBxScgrSSgwGgOXgppKfd8jcfvWfM93hTIJJuCuG5cFvkqdi0pTDZi4VB0r6xfeODRGOesVNr25C8UbWwkUma9COjvUgr3kkM8yvQ_ipim6hQ7hABxUcEAweKUfKPihnYrc-lAarkLuan0Dv67CY90hBxa-Q-J8L1j017LVuuQ3lbC2310B6coM75LXb9EHQJFSlUDCgZ'
    };

    return (
        <div className="max-w-md mx-auto min-h-screen pb-32 dark text-white bg-background-dark">
            <Header title="カンプ確認・調整" rightIcon="share" />
            <main className="pb-32">
                <div className="px-4 py-4">
                    <div className="flex h-11 items-center justify-center rounded-xl bg-slate-800 p-1">
                        <button
                            onClick={() => setActiveTab('rough')}
                            className={`flex-1 h-full rounded-lg text-sm font-bold transition-all ${
                                activeTab === 'rough'
                                    ? 'bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-500'
                            }`}
                        >
                            元のラフ
                        </button>
                        <button
                            onClick={() => setActiveTab('ai')}
                            className={`flex-1 h-full rounded-lg text-sm font-bold transition-all ${
                                activeTab === 'ai'
                                    ? 'bg-slate-700 text-primary shadow-sm'
                                    : 'text-slate-500'
                            }`}
                        >
                            AI完成予想図
                        </button>
                    </div>
                </div>
                <div className="px-4 relative">
                    <div
                        className="relative aspect-[4/5] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl bg-cover bg-center transition-all"
                        style={{ backgroundImage: `url('${images[activeTab]}')` }}
                    >
                        {activeTab === 'ai' && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 bg-white/10 backdrop-blur-xl border border-white/20 p-2 rounded-2xl">
                                <Link to="/redpen-edit" className="p-3 bg-primary text-white rounded-xl">
                                    <span className="material-symbols-outlined">edit</span>
                                </Link>
                                <button className="p-3 hover:bg-white/10 rounded-xl transition-colors">
                                    <span className="material-symbols-outlined">undo</span>
                                </button>
                            </div>
                        )}
                        {activeTab === 'rough' && (
                            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-3">
                                <p className="text-xs text-slate-300">元のラフ画像です。AI完成予想図と比較できます。</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-background-dark/80 backdrop-blur-xl border-t border-slate-800 px-4 py-6 pb-10">
                <Link to="/final-preview" className="w-full flex items-center justify-center h-14 rounded-2xl bg-primary text-white font-bold shadow-lg">
                    指示書に採用
                </Link>
            </footer>
        </div>
    );
};

export default RoughAdjust;
