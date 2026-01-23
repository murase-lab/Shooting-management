import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

const ShotChecklist = () => (
    <div className="max-w-md mx-auto min-h-screen pb-32 dark text-white bg-background-dark">
        <Header title="現場用チェックリスト" showBack={false} />
        <main className="p-4 space-y-6">
            <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-end">
                    <p className="text-2xl font-bold">
                        75% <span className="text-sm font-normal text-slate-500">完了</span>
                    </p>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#dc1849]" style={{ width: '75%' }}></div>
                </div>
            </div>
            <div className="flex flex-col rounded-xl overflow-hidden bg-surface-dark border-2 border-[#dc1849] shadow-2xl">
                <div
                    className="aspect-video bg-cover bg-center red-pen-overlay"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDgGnU1PaYlz9FQyiP4YhG5AOYAS4M3BDTUjQYxh-p1eRqEJr41jZWol6bz7P_8DsJbKI3V0yXzByreuYi2KEobbL67DyPOvyvtQLxLiRhmnoGZQmMEibduCuHw2q8K7hCvQ76LV6UkDL6iXm2J3nq4P_YceR3Gc4F5TE14i-f7-fR46CrY9j0SgMZRcSnwlsxja_hMg98Frep21C0JYYDk-Sl93rBNWLVwJEOUk9M0eLjXT_7RnZ7jx1ltLtbWmmPY6IxsbtcjqOKC')" }}
                ></div>
                <div className="p-4 space-y-4">
                    <div>
                        <span className="text-[#dc1849] font-bold text-sm tracking-widest uppercase">Shot #13</span>
                        <h3 className="text-xl font-bold">プレミアムフレグランス：正面</h3>
                    </div>
                    <button className="w-full h-14 bg-[#dc1849] text-white rounded-xl font-bold text-lg shadow-lg">完了としてマーク</button>
                </div>
            </div>
        </main>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-dark pt-10 z-50">
            <div className="max-w-md mx-auto">
                <button className="w-full h-16 bg-white text-black rounded-full font-black text-lg shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02]">
                    <span className="material-symbols-outlined text-3xl">videocam</span>
                    ライブカメラ起動
                </button>
            </div>
        </div>
        <BottomNav active="project" />
    </div>
);

export default ShotChecklist;
