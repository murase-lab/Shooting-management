import Header from '../components/Header';

const RedpenEdit = () => (
    <div className="max-w-md mx-auto min-h-screen pb-32 dark text-white bg-background-dark">
        <Header title="AIカンプ・赤ペン指示" rightIcon="check" />
        <main>
            <div className="px-4 py-4 flex justify-center">
                <div className="inline-flex p-1 bg-slate-800 rounded-full">
                    <button className="px-6 py-1.5 rounded-full text-xs font-bold bg-slate-700 text-primary">AI完成予想図</button>
                </div>
            </div>
            <div className="px-4 relative">
                <div
                    className="relative aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-cover bg-center"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAhhGrvcPXI2Ftery50V8dyGcNp2EEE3Zs2AGthrkK119jAbcMVrtGqGWAAxYKFav_kWbvXBxScgrSSgwGgOXgppKfd8jcfvWfM93hTIJJuCuG5cFvkqdi0pTDZi4VB0r6xfeODRGOesVNr25C8UbWwkUma9COjvUgr3kkM8yvQ_ipim6hQ7hABxUcEAweKUfKPihnYrc-lAarkLuan0Dv67CY90hBxa-Q-J8L1j017LVuuQ3lbC2310B6coM75LXb9EHQJFSlUDCgZ')" }}
                >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 400">
                        <path d="M 120,180 C 110,175 180,165 190,180 C 200,195 195,215 180,225" fill="none" stroke="#FF4B4B" strokeWidth="3" />
                    </svg>
                    <div className="absolute top-[140px] left-[110px] bg-[#FF4B4B] text-white text-[10px] font-bold px-2 py-1 rounded">ロゴをはっきりと</div>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 bg-black/40 backdrop-blur-xl p-2.5 rounded-2xl">
                        <button className="p-2.5 bg-[#FF4B4B] rounded-xl">
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className="p-2.5">
                            <span className="material-symbols-outlined">sticky_note_2</span>
                        </button>
                    </div>
                </div>
            </div>
        </main>
        <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark/90 backdrop-blur-xl border-t border-slate-800">
            <button className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-primary text-white font-bold shadow-lg">
                保存して指示書に追加
            </button>
        </footer>
    </div>
);

export default RedpenEdit;
