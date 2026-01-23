import Header from '../components/Header';

const DeliveryProgress = () => (
    <div className="max-w-md mx-auto min-h-screen pb-40">
        <Header title="撮影進捗・Google納品" />
        <main className="p-4 space-y-6">
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">現在の進捗</p>
                        <h4 className="text-lg font-bold">撮影当日進捗</h4>
                    </div>
                    <span className="text-2xl font-bold text-primary">65%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '65%' }}></div>
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="text-lg font-bold">カット別納品管理</h3>
                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="h-16 w-16 rounded-xl bg-gray-100 bg-cover bg-center"
                            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCk1vEZrjAxj4dcortJVj01UVq2FCxrYcwbxixNXnurcyT4mr0W_uzfIP3dhobhI2T3_nQR1Lk7FfeqRTK2xeEGmmgqrEbJapDde_LQA-KQAwc-rlyK2afPsthHtztJd3rzR4cvIomQ7NSUxQaeZdnCMy2u9jjyS8MMeEXJufa9ESV8LowR1wPeRyJUjvLpLxVwEgYIcZD9UtHqhuwFf60lalBGvZGco0557uuWUpU_7GnEGTpvH09ROz-BYN2sGdfFzuErUT1e6t7n')" }}
                        ></div>
                        <div className="flex-1">
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 rounded-full">ID: SH-001</span>
                            <p className="font-bold">リネンシャツ</p>
                        </div>
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-gray-50 border text-xs font-bold">Google ドライブを開く</button>
                </div>
            </div>
        </main>
        <footer className="fixed bottom-0 z-50 w-full max-w-md bg-white border-t p-4 pb-8">
            <button className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg">納品を完了して通知</button>
        </footer>
    </div>
);

export default DeliveryProgress;
