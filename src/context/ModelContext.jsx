import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { modelsApi } from '../services/api';

const ModelContext = createContext();

// 初期サンプルデータ
const initialModels = [
    {
        id: 1,
        name: 'エレナ・ロドリゲス',
        gender: '女性',
        age: 24,
        topSize: 'M',
        bottomSize: 'S',
        shoeSize: '24.5',
        modelType: 'agency',
        agencyName: 'Elite Model Management',
        portfolioUrl: 'https://elite.com/elena',
        instagramUrl: 'https://instagram.com/elena_model',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb5MoeAC10Rqu72eWAiVXabbfEXHPiq-mAuBFrYNPsExAiIWQNF-NS-8DNZXUu41QMrMcFKHY7MGwGPAOb_HygjK703QP_gMYMa6woZE8pig01KWOoBnoZyprelDluD5osNxt51ARHep9PEkqvTEem6n2t_haDQD9M7FdoRPzhWETfXP8XiwQ4QKWntfxki-MhskK1cNlC4KzHY6zn_aoA_NT5PRYZR1J9y_GiKESlggI7X9JuyUCQa2G2jFsNYfjES2Dv8QKtxWtP',
        memo: '',
        createdAt: '2024-01-15',
    },
    {
        id: 2,
        name: '田中 美咲',
        gender: '女性',
        age: 22,
        topSize: 'S',
        bottomSize: 'S',
        shoeSize: '23.5',
        modelType: 'agency',
        agencyName: 'Tokyo Models',
        portfolioUrl: '',
        instagramUrl: 'https://instagram.com/misaki_tnk',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb5MoeAC10Rqu72eWAiVXabbfEXHPiq-mAuBFrYNPsExAiIWQNF-NS-8DNZXUu41QMrMcFKHY7MGwGPAOb_HygjK703QP_gMYMa6woZE8pig01KWOoBnoZyprelDluD5osNxt51ARHep9PEkqvTEem6n2t_haDQD9M7FdoRPzhWETfXP8XiwQ4QKWntfxki-MhskK1cNlC4KzHY6zn_aoA_NT5PRYZR1J9y_GiKESlggI7X9JuyUCQa2G2jFsNYfjES2Dv8QKtxWtP',
        memo: '',
        createdAt: '2024-02-20',
    },
    {
        id: 3,
        name: 'ソフィア・チェン',
        gender: '女性',
        age: 26,
        topSize: 'M',
        bottomSize: 'M',
        shoeSize: '25.0',
        modelType: 'freelance',
        agencyName: '',
        portfolioUrl: 'https://sophia-chen.com',
        instagramUrl: 'https://instagram.com/sophia.chen',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb5MoeAC10Rqu72eWAiVXabbfEXHPiq-mAuBFrYNPsExAiIWQNF-NS-8DNZXUu41QMrMcFKHY7MGwGPAOb_HygjK703QP_gMYMa6woZE8pig01KWOoBnoZyprelDluD5osNxt51ARHep9PEkqvTEem6n2t_haDQD9M7FdoRPzhWETfXP8XiwQ4QKWntfxki-MhskK1cNlC4KzHY6zn_aoA_NT5PRYZR1J9y_GiKESlggI7X9JuyUCQa2G2jFsNYfjES2Dv8QKtxWtP',
        memo: '',
        createdAt: '2024-03-10',
    },
    {
        id: 4,
        name: '山田 健太',
        gender: '男性',
        age: 28,
        topSize: 'L',
        bottomSize: 'M',
        shoeSize: '27.0',
        modelType: 'agency',
        agencyName: 'Bark in Style',
        portfolioUrl: '',
        instagramUrl: 'https://instagram.com/kenta_yamada',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb5MoeAC10Rqu72eWAiVXabbfEXHPiq-mAuBFrYNPsExAiIWQNF-NS-8DNZXUu41QMrMcFKHY7MGwGPAOb_HygjK703QP_gMYMa6woZE8pig01KWOoBnoZyprelDluD5osNxt51ARHep9PEkqvTEem6n2t_haDQD9M7FdoRPzhWETfXP8XiwQ4QKWntfxki-MhskK1cNlC4KzHY6zn_aoA_NT5PRYZR1J9y_GiKESlggI7X9JuyUCQa2G2jFsNYfjES2Dv8QKtxWtP',
        memo: '',
        createdAt: '2024-03-25',
    },
];

// localStorage読み込み関数（初期化用）
const loadModelsFromStorage = () => {
    const STORAGE_KEY = 'shooting-master-models';
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        console.log('【初期化】localStorage raw value:', saved ? saved.substring(0, 100) + '...' : 'null');

        if (saved && saved !== 'null' && saved !== 'undefined') {
            const parsed = JSON.parse(saved);
            console.log('【初期化】パース成功:', parsed.length, '件');
            console.log('【初期化】モデル名:', parsed.map(m => m.name).join(', '));

            // 配列であることを確認
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
            console.log('【初期化】パース結果が空または配列でない、初期データ使用');
        } else {
            console.log('【初期化】localStorageにデータなし、初期データ使用');
        }
        return initialModels;
    } catch (error) {
        console.error('【初期化エラー】localStorageからの読み込みに失敗:', error);
        return initialModels;
    }
};

export const ModelProvider = ({ children }) => {
    const [models, setModels] = useState(loadModelsFromStorage);

    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
    const [lastSyncTime, setLastSyncTime] = useState(null);

    // 進行中のAPI操作を追跡（useRefで参照を保持）
    const pendingOperationsRef = useRef([]);
    // 同期中フラグ
    const isSyncingRef = useRef(false);

    // ユーザーIDを取得（全デバイスで共通の「owner」を使用）
    const getUserId = useCallback(() => {
        return 'owner';
    }, []);

    // 初回レンダリングかどうかを追跡
    const isFirstRender = useRef(true);

    // localStorageに保存（初回レンダリング時はスキップ）
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        try {
            localStorage.setItem('shooting-master-models', JSON.stringify(models));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }
    }, [models]);

    // クラウドからデータを取得（クラウドで上書き、画像のみローカルを補完）
    const fetchFromCloud = useCallback(async () => {
        const userId = getUserId();

        try {
            setSyncStatus('syncing');
            console.log('【fetchFromCloud】クラウドからデータ取得中...');

            // 1. まずlocalStorageから現在のデータを取得（画像補完用）
            let localModels = [];
            try {
                const saved = localStorage.getItem('shooting-master-models');
                if (saved) {
                    localModels = JSON.parse(saved);
                    console.log('【fetchFromCloud】ローカルデータ:', localModels.length, '件');
                }
            } catch (e) {
                console.log('【fetchFromCloud】localStorage読み込み失敗');
            }

            // 2. クラウドからデータを取得
            const cloudModels = await modelsApi.getAll(userId);
            console.log('【fetchFromCloud】クラウドデータ:', cloudModels?.length || 0, '件');

            if (cloudModels && cloudModels.length > 0) {
                // 3. クラウドのデータで上書き（画像のみローカルから補完）
                const localModelMap = new Map(localModels.map(m => [String(m.id), m]));

                const finalModels = cloudModels.map(cloudModel => {
                    const localModel = localModelMap.get(String(cloudModel.id));
                    return {
                        ...cloudModel,
                        image: cloudModel.image || localModel?.image || '',
                    };
                });

                console.log('【fetchFromCloud】クラウドから取得完了:', finalModels.length, '件');

                // 4. stateを更新
                setModels(finalModels);
                setLastSyncTime(new Date().toISOString());

                // 5. localStorageにも保存
                try {
                    localStorage.setItem('shooting-master-models', JSON.stringify(finalModels));
                    console.log('【fetchFromCloud】localStorageに保存完了');
                } catch (e) {
                    console.log('【fetchFromCloud】localStorageへの保存失敗');
                }
            } else {
                console.log('【fetchFromCloud】クラウドにデータなし、ローカルデータを維持');
            }
            setSyncStatus('synced');
            return { success: true };
        } catch (error) {
            console.error('【fetchFromCloud】クラウドからの取得に失敗:', error);
            setSyncStatus('error');
            // オフラインの場合はローカルデータを維持
            return { success: false, message: error.message };
        }
    }, [getUserId]);

    // クラウドから同期する関数（クラウドで上書き、画像のみローカルを補完）
    const syncFromCloud = useCallback(async () => {
        // 既に同期中の場合はスキップ
        if (isSyncingRef.current) {
            console.log('同期中のためスキップ');
            return;
        }

        try {
            isSyncingRef.current = true;

            // 進行中のAPI操作がある場合は、それらが完了するまで待つ
            const pendingOps = pendingOperationsRef.current;
            if (pendingOps.length > 0) {
                console.log(`${pendingOps.length}件の進行中の操作を待機中...`);
                await Promise.all(pendingOps);
                console.log('進行中の操作が完了しました');
            }

            // localStorageから直接読み込み（画像補完用）
            const localModels = JSON.parse(localStorage.getItem('shooting-master-models') || '[]');
            console.log('localStorage から取得:', localModels.length, '件');

            // クラウドからデータを取得
            const cloudModels = await modelsApi.getAll('owner');
            console.log('クラウドから取得:', cloudModels?.length || 0, '件');

            if (cloudModels && cloudModels.length > 0) {
                // クラウドのデータで上書き（画像のみローカルから補完）
                const localModelMap = new Map(localModels.map(m => [String(m.id), m]));

                const finalModels = cloudModels.map(cloudModel => {
                    const localModel = localModelMap.get(String(cloudModel.id));
                    return {
                        ...cloudModel,
                        image: cloudModel.image || localModel?.image || '',
                    };
                });

                console.log('同期完了: クラウドから', finalModels.length, '件で上書き');

                // stateを更新
                setModels(finalModels);

                // localStorageにも保存
                try {
                    localStorage.setItem('shooting-master-models', JSON.stringify(finalModels));
                } catch (e) {
                    console.log('localStorage保存失敗');
                }
            }
        } catch (error) {
            console.log('自動同期スキップ（オフラインまたはAPIエラー）:', error.message);
            // エラー時はlocalStorageのデータをそのまま使用（何もしない）
        } finally {
            isSyncingRef.current = false;
        }
    }, []);

    // アプリ起動時に自動でクラウドから同期
    useEffect(() => {
        fetchFromCloud();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ページがフォーカスされた時（タブがアクティブになった時）に同期
    // 注意: 同期を一時的に無効化してローカルのみで動作テスト
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('ページがアクティブになりました。同期は無効化中');
                // 少し遅延を入れて、進行中の操作がRefに追加されるのを待つ
                // setTimeout(() => {
                //     syncFromCloud();
                // }, 500);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [syncFromCloud]);

    // クラウドに同期
    const syncToCloud = useCallback(async () => {
        const userId = getUserId();

        try {
            setSyncStatus('syncing');
            // モデルを1つずつ同期
            for (const model of models) {
                try {
                    await modelsApi.create(userId, { ...model, id: String(model.id) });
                } catch (e) {
                    // 既に存在する場合は更新
                    await modelsApi.update(userId, String(model.id), model);
                }
            }
            setLastSyncTime(new Date().toISOString());
            setSyncStatus('synced');
            return { success: true };
        } catch (error) {
            console.error('クラウドへの同期に失敗:', error);
            setSyncStatus('error');
            return { success: false, message: error.message };
        }
    }, [getUserId, models]);

    const addModel = useCallback(async (modelData) => {
        const newModel = {
            ...modelData,
            id: Date.now(),
            createdAt: new Date().toISOString().split('T')[0],
        };

        // 1. localStorageから現在のデータを取得
        let currentModels = [];
        try {
            const saved = localStorage.getItem('shooting-master-models');
            if (saved) {
                currentModels = JSON.parse(saved);
            }
        } catch (e) {
            // 読み込み失敗時は空配列のまま
        }

        // 2. 新しいモデルを追加
        const newModels = [newModel, ...currentModels.filter(m => String(m.id) !== String(newModel.id))];

        // 3. localStorageに保存
        try {
            localStorage.setItem('shooting-master-models', JSON.stringify(newModels));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setModels(newModels);

        // クラウドに保存（awaitで完了を待つ）
        const userId = getUserId();
        if (userId !== 'anonymous') {
            const operation = (async () => {
                try {
                    console.log('クラウドへの保存開始:', newModel.name);
                    const result = await modelsApi.create(userId, { ...newModel, id: String(newModel.id) });
                    console.log('モデルをクラウドに保存しました:', newModel.name, result);
                } catch (error) {
                    console.error('クラウドへの保存に失敗:', error);
                    // 失敗してもローカルには残す
                }
            })();

            // 進行中の操作として追跡（useRefを使用）
            pendingOperationsRef.current = [...pendingOperationsRef.current, operation];
            console.log('進行中の操作数:', pendingOperationsRef.current.length);

            await operation;

            // 完了したら配列から削除
            pendingOperationsRef.current = pendingOperationsRef.current.filter(op => op !== operation);
            console.log('操作完了。残りの進行中操作:', pendingOperationsRef.current.length);
        }

        return newModel;
    }, [getUserId]);

    const updateModel = useCallback(async (id, modelData) => {
        console.log('【updateModel】モデル更新開始:', id);

        // 1. まずlocalStorageから現在のデータを取得
        let currentModels = [];
        try {
            const saved = localStorage.getItem('shooting-master-models');
            if (saved) {
                currentModels = JSON.parse(saved);
            }
        } catch (e) {
            console.log('【updateModel】localStorage読み込み失敗');
        }

        // 2. 既存のモデルを取得
        const existingModel = currentModels.find(m => String(m.id) === String(id));
        const updatedModel = existingModel
            ? { ...existingModel, ...modelData }
            : modelData;

        console.log('【updateModel】更新:', updatedModel.name);

        // 3. 新しい配列を作成
        const newModels = currentModels.map(model =>
            String(model.id) === String(id) ? updatedModel : model
        );

        // 4. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-models', JSON.stringify(newModels));
            console.log('【updateModel】localStorageに保存完了:', newModels.length, '件');
        } catch (error) {
            console.error('【updateModel】localStorage保存エラー:', error);
        }

        // 5. stateを更新
        setModels(newModels);

        // クラウドに更新（awaitで完了を待つ）
        const userId = getUserId();
        if (userId !== 'anonymous') {
            const operation = (async () => {
                try {
                    // 完全なモデルデータを送信（部分更新ではなく）
                    console.log('クラウドへの更新開始:', id);
                    const result = await modelsApi.update(userId, String(id), updatedModel);
                    console.log('モデルをクラウドで更新しました:', id, result);
                } catch (error) {
                    console.error('クラウドへの更新に失敗:', error);
                    // 失敗してもローカルには残す
                }
            })();

            // 進行中の操作として追跡（useRefを使用）
            pendingOperationsRef.current = [...pendingOperationsRef.current, operation];
            await operation;
            // 完了したら配列から削除
            pendingOperationsRef.current = pendingOperationsRef.current.filter(op => op !== operation);
        }
    }, [getUserId]);

    const deleteModel = useCallback(async (id) => {
        console.log('【deleteModel】モデル削除開始:', id);

        // 1. まずlocalStorageから現在のデータを取得
        let currentModels = [];
        try {
            const saved = localStorage.getItem('shooting-master-models');
            if (saved) {
                currentModels = JSON.parse(saved);
            }
        } catch (e) {
            console.log('【deleteModel】localStorage読み込み失敗');
        }

        // 2. 新しい配列を作成（指定IDを除外）
        const newModels = currentModels.filter(model => String(model.id) !== String(id));
        console.log('【deleteModel】削除後:', newModels.length, '件');

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-models', JSON.stringify(newModels));
            console.log('【deleteModel】localStorageに保存完了:', newModels.length, '件');
        } catch (error) {
            console.error('【deleteModel】localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setModels(newModels);

        // クラウドからも削除（awaitで完了を待つ）
        const userId = getUserId();
        if (userId !== 'anonymous') {
            const operation = (async () => {
                try {
                    await modelsApi.delete(userId, String(id));
                    console.log('モデルをクラウドから削除しました:', id);
                } catch (error) {
                    console.error('クラウドからの削除に失敗:', error);
                }
            })();

            // 進行中の操作として追跡（useRefを使用）
            pendingOperationsRef.current = [...pendingOperationsRef.current, operation];
            await operation;
            // 完了したら配列から削除
            pendingOperationsRef.current = pendingOperationsRef.current.filter(op => op !== operation);
        }
    }, [getUserId]);

    const getModelById = useCallback((id) => {
        // IDが文字列でも数値でも比較できるように両方を試す
        return models.find(model => String(model.id) === String(id));
    }, [models]);

    return (
        <ModelContext.Provider value={{
            models,
            addModel,
            updateModel,
            deleteModel,
            getModelById,
            // クラウド同期
            syncStatus,
            lastSyncTime,
            fetchFromCloud,
            syncToCloud,
        }}>
            {children}
        </ModelContext.Provider>
    );
};

export const useModels = () => {
    const context = useContext(ModelContext);
    if (!context) {
        throw new Error('useModels must be used within a ModelProvider');
    }
    return context;
};
