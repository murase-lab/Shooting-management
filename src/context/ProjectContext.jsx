import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../services/api';
import { uploadImageToR2, isBase64Image, uploadProjectImagesToR2 } from '../services/imageService';

const ProjectContext = createContext();

// 初期サンプルデータ
const initialProjects = [
    {
        id: 1,
        name: 'サマー・スキンケア 2024',
        description: '夏向けスキンケア製品のプロモーション撮影',
        productImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4tFFNk_65OTac1t7yY84HvVKYVW0OMn70-l8jCnR1DwBej-1ftmBNgJ0tqkKJMpb4t_JmRcEgEIBHtIUFgsOga91oVmp1gFfiwQEuLO_N7K-ZGqD2fIlKpdGfU_V1iidbYGYWa6UsdRUAwGSwh4Zzd-BCThAixfjyniK70lZPoy2vHCzsd7U3Od1GBJ0KGjbUHjfHkXoyNX2PeH1279OiDwYjwaGYsCxKMgSjZcrQMFKJ0oXq7IKzry3VB7cFazd1fWpgBGPNw75J',
        status: 'in_progress', // 'draft', 'in_progress', 'completed'
        shootingDate: '2024-07-15',
        createdAt: '2024-06-01',
        // 小物・備品リスト
        props: [
            {
                id: 201,
                name: 'サマースキンケアセット',
                category: 'product', // 'product'=撮影商品, 'prop'=小物, 'costume'=衣装
                image: '',
                checked: true,
                notes: 'メイン撮影商品3点セット',
                // 納品関連
                driveUrl: '', // Googleドライブフォルダ URL
                delivery: {
                    status: 'pending', // 'pending', 'uploaded', 'approved', 'revision_requested'
                    uploadedAt: null,
                    uploadedFiles: [], // { name, url, thumbnail }
                    clientChecked: false,
                    clientCheckedAt: null,
                    revisions: [], // { id, message, createdAt, resolvedAt }
                },
            },
            {
                id: 202,
                name: '観葉植物（大）',
                category: 'prop',
                image: '',
                checked: true,
                notes: '背景用グリーン',
            },
            {
                id: 203,
                name: '白いリネンシーツ',
                category: 'prop',
                image: '',
                checked: false,
                notes: '敷物として使用',
            },
            {
                id: 204,
                name: 'モデル用サマーワンピース',
                category: 'costume',
                image: '',
                checked: false,
                notes: 'Sサイズ・白',
            },
        ],
        cuts: [
            {
                id: 101,
                title: '俯瞰：泡のディテール',
                scene: 'Scene A',
                description: '製品の泡立ちを強調したマクロ撮影',
                originalImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKzxGK6mAC4yCD8FzDKe4KzNRQelYRS6BYNvaqR9jvdUMSpVHvkzksSXnpMImB32DOyLd0pc9UCDpmpg9MwdGJIb_-ofZvm59NoX041hMIkRDmZ3MuU1aCzNN9aFtXn9KIQed1mQbcraVa6MOqCSlfQmROmeGMLKx50hJBNPvWjhlMfJEFxKz7nnmu610jk__VCnmo_TVrYyawpuD-BhsCHWwoGYthGSQC7VjlxOUo-ncapwK8kBIQpHnONoz_oPDuPGd-hIP0lQyl',
                aiGeneratedImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhhGrvcPXI2Ftery50V8dyGcNp2EEE3Zs2AGthrkK119jAbcMVrtGqGWAAxYKFav_kWbvXBxScgrSSgwGgOXgppKfd8jcfvWfM93hTIJJuCuG5cFvkqdi0pTDZi4VB0r6xfeODRGOesVNr25C8UbWwkUma9COjvUgr3kkM8yvQ_ipim6hQ7hABxUcEAweKUfKPihnYrc-lAarkLuan0Dv67CY90hBxa-Q-J8L1j017LVuuQ3lbC2310B6coM75LXb9EHQJFSlUDCgZ',
                angle: '俯瞰',
                lighting: 'ソフト・ディフューズ',
                comments: '泡の質感を際立たせる。背景は白で統一。',
                status: 'completed',
                createdAt: '2024-06-05',
                propIds: [201, 202, 203], // 使用する小物のID
                modelIds: [1, 2], // 使用するモデルのID
            },
            {
                id: 102,
                title: '正面：パッケージ全体',
                scene: 'Scene A',
                description: 'パッケージデザインを正面から撮影',
                originalImage: '',
                aiGeneratedImage: '',
                angle: '正面',
                lighting: 'スタジオライト',
                comments: 'ロゴがはっきり見えるように',
                status: 'pending',
                createdAt: '2024-06-06',
                propIds: [201, 204], // 使用する小物のID
                modelIds: [], // モデル不要
            },
        ],
    },
];

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState(() => {
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            return saved ? JSON.parse(saved) : initialProjects;
        } catch (error) {
            console.error('localStorageからの読み込みに失敗:', error);
            return initialProjects;
        }
    });

    const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false); // 同期中ロック
    const [lastOperationTime, setLastOperationTime] = useState(0); // 最後の操作時刻（追加/削除/更新）
    const [operationInProgress, setOperationInProgress] = useState(false); // 操作中ロック（CRUDの途中でsyncが割り込まないようにする）

    // ユーザーIDを取得（全デバイスで共通の「owner」を使用）
    const getUserId = useCallback(() => {
        return 'owner';
    }, []);

    // IDを正規化して比較用の文字列を返す
    const normalizeId = (id) => {
        if (id === undefined || id === null) return '';
        return String(id).trim();
    };

    // 配列内のアイテムをIDで重複排除する（後のアイテムを優先）
    const deduplicateById = (items) => {
        if (!items || !Array.isArray(items)) return [];
        const map = new Map();
        items.forEach(item => {
            if (item && item.id !== undefined && item.id !== null) {
                map.set(normalizeId(item.id), item);
            }
        });
        return Array.from(map.values());
    };

    // プロジェクト内のカット・小物を重複排除してマージする（クラウド優先）
    // 削除がクラウドに反映されるよう、クラウドのデータをベースにする
    const mergeProjectDataSafe = (localProject, cloudProject) => {
        if (!localProject) return cloudProject;
        if (!cloudProject) return localProject;

        const localCuts = localProject.cuts || [];
        const cloudCuts = cloudProject.cuts || [];
        const localProps = localProject.props || [];
        const cloudProps = cloudProject.props || [];

        // ローカルのカット・小物をIDでマップ化
        const localCutMap = new Map(localCuts.map(c => [normalizeId(c.id), c]));
        const localPropMap = new Map(localProps.map(p => [normalizeId(p.id), p]));

        // クラウドのカットをベースにマージ（画像・propIds・modelIdsは空でない方を優先）
        const mergedCloudCuts = cloudCuts.map(cloudCut => {
            const localCut = localCutMap.get(normalizeId(cloudCut.id));
            if (localCut) {
                // 両方にある場合、空でない方を優先
                return {
                    ...cloudCut,
                    originalImage: cloudCut.originalImage || localCut.originalImage || '',
                    aiGeneratedImage: cloudCut.aiGeneratedImage || localCut.aiGeneratedImage || '',
                    propIds: (cloudCut.propIds?.length > 0) ? cloudCut.propIds : (localCut.propIds || []),
                    modelIds: (cloudCut.modelIds?.length > 0) ? cloudCut.modelIds : (localCut.modelIds || []),
                };
            }
            return cloudCut;
        });

        // クラウドの小物をベースにマージ（画像は空でない方を優先）
        const mergedCloudProps = cloudProps.map(cloudProp => {
            const localProp = localPropMap.get(normalizeId(cloudProp.id));
            if (localProp) {
                return {
                    ...cloudProp,
                    image: cloudProp.image || localProp.image || '',
                };
            }
            return cloudProp;
        });

        // クラウドのIDセットを作成
        const cloudCutIdSet = new Set(cloudCuts.map(c => normalizeId(c.id)));
        const cloudPropIdSet = new Set(cloudProps.map(p => normalizeId(p.id)));

        // ローカルにしかないアイテムを抽出（まだクラウドに同期されていない新規追加）
        const localOnlyCuts = localCuts.filter(cut => !cloudCutIdSet.has(normalizeId(cut.id)));
        const localOnlyProps = localProps.filter(prop => !cloudPropIdSet.has(normalizeId(prop.id)));

        // マージして重複排除
        const mergedCuts = deduplicateById([...mergedCloudCuts, ...localOnlyCuts]);
        const mergedProps = deduplicateById([...mergedCloudProps, ...localOnlyProps]);

        // プロジェクト画像は空でない方を優先
        const productImage = cloudProject.productImage || localProject.productImage || '';

        return {
            ...cloudProject,
            productImage,
            cuts: mergedCuts,
            props: mergedProps,
        };
    };

    useEffect(() => {
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(projects));
        } catch (error) {
            console.error('localStorageへの保存に失敗:', error);
            // 容量超過の場合、古い画像データを削除して再試行
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.warn('localStorage容量超過 - 画像データをクリアして再試行');
                const cleanedProjects = projects.map(project => ({
                    ...project,
                    productImage: project.productImage?.startsWith('data:') ? '' : project.productImage,
                    cuts: project.cuts.map(cut => ({
                        ...cut,
                        originalImage: cut.originalImage?.startsWith('data:') ? '' : cut.originalImage,
                        aiGeneratedImage: cut.aiGeneratedImage?.startsWith('data:') ? '' : cut.aiGeneratedImage,
                    }))
                }));
                try {
                    localStorage.setItem('shooting-master-projects', JSON.stringify(cleanedProjects));
                } catch (retryError) {
                    console.error('再試行も失敗:', retryError);
                }
            }
        }
    }, [projects]);

    // クラウドからデータを取得（mergeProjectDataSafeでマージ、ローカルのみのカットを保護）
    const fetchFromCloud = useCallback(async () => {
        const userId = getUserId();

        // 同期中ロック
        if (isSyncing) {
            console.log('同期中のためスキップ');
            return { success: false, message: 'Already syncing' };
        }

        // 操作中は割り込まない
        if (operationInProgress) {
            console.log('操作実行中のためスキップ');
            return { success: false, message: 'Operation in progress' };
        }

        setIsSyncing(true);

        try {
            setSyncStatus('syncing');
            const cloudProjects = await projectsApi.getAll(userId);

            // 1. まずローカルのデータを取得
            const localProjects = getLatestProjectsFromStorage();

            // 2. クラウドのデータをベースにmergeProjectDataSafeでマージ（ローカルのみのカットも保護）
            if (cloudProjects && cloudProjects.length > 0) {
                const localProjectMap = new Map(localProjects.map(p => [normalizeId(p.id), p]));

                const finalProjects = cloudProjects.map(cloudProject => {
                    const localProject = localProjectMap.get(normalizeId(cloudProject.id));
                    return mergeProjectDataSafe(localProject, cloudProject);
                });

                // ローカルにしかないプロジェクト（まだクラウドに同期されていない）も追加
                const cloudProjectIdSet = new Set(cloudProjects.map(p => normalizeId(p.id)));
                const localOnlyProjects = localProjects.filter(p => !cloudProjectIdSet.has(normalizeId(p.id)));

                const allProjects = [...finalProjects, ...localOnlyProjects];

                saveToLocalStorage(allProjects);
                setProjects(allProjects);
                setLastSyncTime(new Date().toISOString());
                console.log(`クラウドから取得完了: ${allProjects.length}件のプロジェクト`);
            }

            setSyncStatus('synced');
            setIsSyncing(false);
            return { success: true };
        } catch (error) {
            console.error('クラウドからの取得に失敗:', error);
            setSyncStatus('error');
            setIsSyncing(false);
            return { success: false, message: error.message };
        }
    }, [getUserId, isSyncing, operationInProgress]);

    // クラウドから同期する関数（クラウドで上書き、画像のみローカルを補完）
    const syncFromCloud = useCallback(async (forceSync = false) => {
        // 同期中ロック
        if (isSyncing) {
            console.log('同期中のためスキップ');
            return;
        }

        // 操作中（addCut/updateCut/deleteCut等の途中）はスキップ
        if (operationInProgress) {
            console.log('操作実行中のためスキップ');
            return;
        }

        // 操作直後（15秒以内）は自動同期をスキップ（強制同期の場合は除く）
        const timeSinceLastOperation = Date.now() - lastOperationTime;
        if (!forceSync && timeSinceLastOperation < 15000) {
            console.log(`操作直後のためスキップ（${Math.round(timeSinceLastOperation / 1000)}秒経過）`);
            return;
        }

        setIsSyncing(true);

        try {
            const cloudProjects = await projectsApi.getAll('owner');

            // 1. ローカルの最新データを取得
            const localProjects = getLatestProjectsFromStorage();

            // 2. mergeProjectDataSafeでマージ（ローカルのみのカットも保護）
            if (cloudProjects && cloudProjects.length > 0) {
                const localProjectMap = new Map(localProjects.map(p => [normalizeId(p.id), p]));

                const finalProjects = cloudProjects.map(cloudProject => {
                    const localProject = localProjectMap.get(normalizeId(cloudProject.id));
                    return mergeProjectDataSafe(localProject, cloudProject);
                });

                // ローカルにしかないプロジェクトも追加
                const cloudProjectIdSet = new Set(cloudProjects.map(p => normalizeId(p.id)));
                const localOnlyProjects = localProjects.filter(p => !cloudProjectIdSet.has(normalizeId(p.id)));

                const allProjects = [...finalProjects, ...localOnlyProjects];

                saveToLocalStorage(allProjects);
                setProjects(allProjects);
                console.log(`同期完了: ${allProjects.length}件のプロジェクト（マージ済み）`);
            }
            setIsSyncing(false);
        } catch (error) {
            console.log('自動同期スキップ（オフラインまたはAPIエラー）:', error.message);
            setIsSyncing(false);
        }
    }, [isSyncing, lastOperationTime, operationInProgress]);

    // アプリ起動時に自動でクラウドから同期（クラウドを正とする）
    useEffect(() => {
        // 初回マウント時に実行
        syncFromCloud();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ページがフォーカスされた時（タブがアクティブになった時）に同期
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('ページがアクティブになりました。プロジェクトを同期...');
                syncFromCloud();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [syncFromCloud]);

    // 定期的にバックグラウンド同期（30秒ごと）
    useEffect(() => {
        const intervalId = setInterval(() => {
            // ページがアクティブな時のみ同期
            if (document.visibilityState === 'visible') {
                console.log('定期同期を実行...');
                syncFromCloud();
            }
        }, 30000); // 30秒

        return () => clearInterval(intervalId);
    }, [syncFromCloud]);

    // クラウドに同期
    const syncToCloud = useCallback(async () => {
        const userId = getUserId();

        try {
            setSyncStatus('syncing');
            // プロジェクトを1つずつ同期
            for (const project of projects) {
                try {
                    await projectsApi.create(userId, { ...project, id: String(project.id) });
                } catch (e) {
                    // 既に存在する場合は更新
                    await projectsApi.update(userId, String(project.id), project);
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
    }, [getUserId, projects]);

    // プロジェクト操作
    const addProject = async (projectData) => {
        const userId = getUserId();

        // 商品画像をR2にアップロード（Base64の場合のみ）
        let productImage = projectData.productImage || '';

        if (userId !== 'anonymous' && isBase64Image(productImage)) {
            try {
                productImage = await uploadImageToR2(productImage, userId);
                console.log('商品画像をR2にアップロード完了');
            } catch (e) {
                console.warn('R2アップロード失敗:', e);
            }
        }

        const newProject = {
            ...projectData,
            id: Date.now(),
            productImage,
            status: 'draft',
            cuts: [],
            props: [],
            createdAt: new Date().toISOString().split('T')[0],
        };

        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. 新しいプロジェクトを追加
        const newProjects = [newProject, ...currentProjects];

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
            console.log('【addProject】保存完了:', newProjects.length, '件');
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // クラウドにも保存を試みる（失敗しても続行）
        if (userId !== 'anonymous') {
            projectsApi.create(userId, { ...newProject, id: String(newProject.id) }).catch(console.error);
        }

        return newProject;
    };

    const updateProject = async (id, projectData) => {
        const userId = getUserId();

        // 商品画像をR2にアップロード（Base64の場合のみ）
        let updatedData = { ...projectData };

        if (userId !== 'anonymous' && isBase64Image(projectData.productImage)) {
            try {
                updatedData.productImage = await uploadImageToR2(projectData.productImage, userId);
            } catch (e) {
                console.warn('R2アップロード失敗:', e);
            }
        }

        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. プロジェクトを更新
        const newProjects = currentProjects.map(project =>
            String(project.id) === String(id) ? { ...project, ...updatedData } : project
        );

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // クラウドにも更新を試みる
        if (userId !== 'anonymous') {
            const updatedProject = newProjects.find(p => String(p.id) === String(id));
            if (updatedProject) {
                projectsApi.update(userId, String(id), updatedProject).catch(console.error);
            }
        }
    };

    const deleteProject = (id) => {
        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. 削除対象を除外
        const newProjects = currentProjects.filter(project => String(project.id) !== String(id));

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
            console.log('【deleteProject】プロジェクト削除完了。残り:', newProjects.length, '件');
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // クラウドからも削除を試みる
        const userId = getUserId();
        if (userId !== 'anonymous') {
            projectsApi.delete(userId, String(id)).catch(console.error);
        }
    };

    // プロジェクトをコピー
    const copyProject = async (id) => {
        const userId = getUserId();

        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. コピー元のプロジェクトを取得
        const sourceProject = currentProjects.find(p => String(p.id) === String(id));
        if (!sourceProject) {
            console.error('コピー元のプロジェクトが見つかりません');
            return null;
        }

        // 3. 新しいプロジェクトを作成（IDを新規生成）
        const newProjectId = Date.now();
        const newProject = {
            ...sourceProject,
            id: newProjectId,
            name: `${sourceProject.name} (コピー)`,
            status: 'draft',
            createdAt: new Date().toISOString().split('T')[0],
            // カットも新しいIDで複製
            cuts: (sourceProject.cuts || []).map((cut, index) => ({
                ...cut,
                id: newProjectId + index + 1,
                status: 'pending',
            })),
            // 小物も新しいIDで複製
            props: (sourceProject.props || []).map((prop, index) => ({
                ...prop,
                id: newProjectId + 1000 + index + 1,
                checked: false,
                delivery: null,
            })),
        };

        // 4. 新しいプロジェクトを追加
        const newProjects = [newProject, ...currentProjects];

        // 5. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
            console.log('【copyProject】プロジェクトコピー完了:', newProject.name);
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 6. stateを更新
        setProjects(newProjects);

        // 7. クラウドにも保存を試みる
        if (userId !== 'anonymous') {
            try {
                await projectsApi.create(userId, { ...newProject, id: String(newProject.id) });
                console.log('コピーしたプロジェクトをクラウドに保存しました');
            } catch (error) {
                console.error('クラウドへの保存に失敗:', error);
            }
        }

        return newProject;
    };

    const getProjectById = (id) => {
        // IDが文字列でも数値でも比較できるように両方を試す
        return projects.find(project => String(project.id) === String(id));
    };

    // localStorageから最新のprojectsを読み込むヘルパー
    const getLatestProjectsFromStorage = () => {
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }
        return [];
    };

    // localStorageに安全に保存するヘルパー（容量超過時は画像を削除して再試行）
    const saveToLocalStorage = (projects, preserveImageId = null) => {
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(projects));
            return projects;
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.warn('localStorage容量超過 - 古い画像データをクリアして再試行');
                const cleanedProjects = projects.map(project => ({
                    ...project,
                    productImage: project.productImage?.startsWith('data:') ? '' : project.productImage,
                    props: (project.props || []).map(prop => ({
                        ...prop,
                        image: prop.image?.startsWith('data:') ? '' : prop.image,
                    })),
                    cuts: (project.cuts || []).map(cut => {
                        if (preserveImageId && String(cut.id) === String(preserveImageId)) {
                            return cut;
                        }
                        return {
                            ...cut,
                            originalImage: cut.originalImage?.startsWith('data:') ? '' : cut.originalImage,
                            aiGeneratedImage: cut.aiGeneratedImage?.startsWith('data:') ? '' : cut.aiGeneratedImage,
                        };
                    })
                }));
                try {
                    localStorage.setItem('shooting-master-projects', JSON.stringify(cleanedProjects));
                    return cleanedProjects;
                } catch (retryError) {
                    alert('容量不足: 設定画面から不要なプロジェクトを削除してください');
                    return projects;
                }
            }
            console.error('localStorage保存エラー:', error);
            return projects;
        }
    };

    // カット操作
    const addCut = async (projectId, cutData) => {
        const newCutId = Date.now();
        const userId = getUserId();

        // 操作中ロックを設定（自動同期の割り込み防止）
        setOperationInProgress(true);

        try {
            // 画像をR2にアップロード（Base64の場合のみ）
            let originalImage = cutData.originalImage || '';
            let aiGeneratedImage = cutData.aiGeneratedImage || '';

            if (userId !== 'anonymous') {
                try {
                    if (isBase64Image(originalImage)) {
                        const uploadedUrl = await uploadImageToR2(originalImage, userId);
                        if (uploadedUrl !== originalImage) {
                            originalImage = uploadedUrl;
                            console.log('カット画像をR2にアップロード完了');
                        }
                    }
                    if (isBase64Image(aiGeneratedImage)) {
                        const uploadedUrl = await uploadImageToR2(aiGeneratedImage, userId);
                        if (uploadedUrl !== aiGeneratedImage) {
                            aiGeneratedImage = uploadedUrl;
                            console.log('AI生成画像をR2にアップロード完了');
                        }
                    }
                } catch (e) {
                    console.warn('R2アップロード失敗、Base64で保存:', e);
                }
            }

            const newCut = {
                ...cutData,
                id: newCutId,
                originalImage,
                aiGeneratedImage,
                status: 'pending',
                propIds: cutData.propIds || [],
                modelIds: cutData.modelIds || [],
                createdAt: new Date().toISOString().split('T')[0],
            };

            // 1. 現在のlocalStorageから最新データを読み込み
            const currentProjects = getLatestProjectsFromStorage();

            // 2. カットを追加
            const newProjects = currentProjects.map(project =>
                String(project.id) === String(projectId)
                    ? { ...project, cuts: [...(project.cuts || []), newCut] }
                    : project
            );

            // 3. localStorageに即座に保存
            const savedProjects = saveToLocalStorage(newProjects, newCutId);

            // 4. stateを更新
            setProjects(savedProjects);

            // 5. 操作時刻を記録（自動同期スキップ用）
            setLastOperationTime(Date.now());

            // 6. クラウドにも同期（元データ=画像ありをクラウドに送信、完了を待機）
            if (userId !== 'anonymous') {
                const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
                if (updatedProject) {
                    try {
                        await projectsApi.update(userId, String(projectId), updatedProject);
                        console.log('カット追加をクラウドに同期完了');

                        // 7. クラウドから最新のプロジェクトを取得してローカルとマージ
                        const cloudProject = await projectsApi.getById(userId, String(projectId));
                        if (cloudProject) {
                            // 重要: マージ時は最新のlocalStorageから読み込む（他の操作が割り込んでいる可能性）
                            const latestProjects = getLatestProjectsFromStorage();
                            const latestLocalProject = latestProjects.find(p => String(p.id) === String(projectId));
                            const mergedProject = mergeProjectDataSafe(latestLocalProject, cloudProject);
                            const syncedProjects = latestProjects.map(p =>
                                String(p.id) === String(projectId) ? mergedProject : p
                            );
                            saveToLocalStorage(syncedProjects);
                            setProjects(syncedProjects);
                            setLastOperationTime(Date.now());
                        }
                    } catch (e) {
                        console.error('クラウド同期エラー:', e);
                    }
                }
            }

            return newCut;
        } finally {
            // 操作中ロックを解除
            setOperationInProgress(false);
        }
    };

    const updateCut = async (projectId, cutId, cutData) => {
        const userId = getUserId();
        setOperationInProgress(true);

        try {
            // 画像をR2にアップロード（Base64の場合のみ）
            let updatedCutData = { ...cutData };

            if (userId !== 'anonymous') {
                try {
                    if (isBase64Image(cutData.originalImage)) {
                        updatedCutData.originalImage = await uploadImageToR2(cutData.originalImage, userId);
                    }
                    if (isBase64Image(cutData.aiGeneratedImage)) {
                        updatedCutData.aiGeneratedImage = await uploadImageToR2(cutData.aiGeneratedImage, userId);
                    }
                } catch (e) {
                    console.warn('R2アップロード失敗:', e);
                }
            }

            // localStorageから最新のデータを取得して更新（レースコンディション防止）
            const currentProjects = getLatestProjectsFromStorage();
            const newProjects = currentProjects.map(project =>
                String(project.id) === String(projectId)
                    ? {
                        ...project,
                        cuts: (project.cuts || []).map(cut =>
                            String(cut.id) === String(cutId) ? { ...cut, ...updatedCutData } : cut
                        )
                    }
                    : project
            );

            saveToLocalStorage(newProjects);
            setProjects(newProjects);

            // 操作時刻を記録（自動同期スキップ用）
            setLastOperationTime(Date.now());

            // クラウドにも同期（完了を待機）
            if (userId !== 'anonymous') {
                const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
                if (updatedProject) {
                    try {
                        await projectsApi.update(userId, String(projectId), updatedProject);
                        console.log('カット更新をクラウドに同期完了');
                    } catch (e) {
                        console.error('クラウド同期エラー:', e);
                    }
                }
            }
        } finally {
            setOperationInProgress(false);
        }
    };

    const deleteCut = async (projectId, cutId) => {
        const userId = getUserId();
        setOperationInProgress(true);

        try {
            // 1. localStorageから最新データを取得（古いstateを参照しない）
            const currentProjects = getLatestProjectsFromStorage();

            // 2. カットを削除
            const newProjects = currentProjects.map(project =>
                String(project.id) === String(projectId)
                    ? { ...project, cuts: (project.cuts || []).filter(cut => String(cut.id) !== String(cutId)) }
                    : project
            );

            // 3. localStorageに保存 + state更新
            saveToLocalStorage(newProjects);
            setProjects(newProjects);

            // 4. 操作時刻を記録（自動同期スキップ用）
            setLastOperationTime(Date.now());

            // 5. クラウドにも同期（削除を反映）
            if (userId !== 'anonymous') {
                const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
                if (updatedProject) {
                    try {
                        await projectsApi.update(userId, String(projectId), updatedProject);
                        console.log('カット削除をクラウドに同期完了');
                    } catch (e) {
                        console.error('クラウド同期エラー:', e);
                    }
                }
            }
        } finally {
            setOperationInProgress(false);
        }
    };

    // カットをコピー
    const copyCut = (projectId, cutId) => {
        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        const project = currentProjects.find(p => String(p.id) === String(projectId));
        const originalCut = project?.cuts?.find(cut => String(cut.id) === String(cutId));
        if (!originalCut) return null;

        const newCut = {
            ...originalCut,
            id: Date.now(),
            title: `${originalCut.title} (コピー)`,
            status: 'pending',
            createdAt: new Date().toISOString().split('T')[0],
        };

        // 2. カットを追加
        const newProjects = currentProjects.map(p =>
            String(p.id) === String(projectId)
                ? { ...p, cuts: [...(p.cuts || []), newCut] }
                : p
        );

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // 5. クラウドにも同期
        const userId = getUserId();
        if (userId !== 'anonymous') {
            const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
            if (updatedProject) {
                projectsApi.update(userId, String(projectId), updatedProject).catch(console.error);
            }
        }

        return newCut;
    };

    const getCutById = (projectId, cutId) => {
        const project = getProjectById(projectId);
        return project?.cuts?.find(cut => String(cut.id) === String(cutId));
    };

    // 小物・備品操作
    const addProp = async (projectId, propData) => {
        const newPropId = Date.now();
        const userId = getUserId();
        setOperationInProgress(true);

        try {
            // 画像をR2にアップロード（Base64の場合のみ）
            let propImage = propData.image || '';

            if (userId !== 'anonymous' && isBase64Image(propImage)) {
                try {
                    const uploadedUrl = await uploadImageToR2(propImage, userId);
                    if (uploadedUrl !== propImage) {
                        propImage = uploadedUrl;
                        console.log('小物画像をR2にアップロード完了');
                    }
                } catch (e) {
                    console.warn('R2アップロード失敗、Base64で保存:', e);
                }
            }

            const newProp = {
                ...propData,
                id: newPropId,
                image: propImage,
                checked: false,
            };

            // 1. localStorageから最新データを読み込み
            const currentProjects = getLatestProjectsFromStorage();

            // 2. 小物を追加
            const newProjects = currentProjects.map(project =>
                String(project.id) === String(projectId)
                    ? { ...project, props: [...(project.props || []), newProp] }
                    : project
            );

            // 3. localStorageに保存
            const savedProjects = saveToLocalStorage(newProjects, newPropId);

            // 4. stateを更新
            setProjects(savedProjects);

            // 5. 操作時刻を記録（自動同期スキップ用）
            setLastOperationTime(Date.now());

            // 6. クラウドにも同期
            if (userId !== 'anonymous') {
                const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
                if (updatedProject) {
                    try {
                        await projectsApi.update(userId, String(projectId), updatedProject);
                        console.log('小物追加をクラウドに同期完了');

                        // 7. クラウドから最新のプロジェクトを取得してマージ
                        const cloudProject = await projectsApi.getById(userId, String(projectId));
                        if (cloudProject) {
                            const latestProjects = getLatestProjectsFromStorage();
                            const latestLocalProject = latestProjects.find(p => String(p.id) === String(projectId));
                            const mergedProject = mergeProjectDataSafe(latestLocalProject, cloudProject);
                            const syncedProjects = latestProjects.map(p =>
                                String(p.id) === String(projectId) ? mergedProject : p
                            );
                            saveToLocalStorage(syncedProjects);
                            setProjects(syncedProjects);
                            setLastOperationTime(Date.now());
                        }
                    } catch (e) {
                        console.error('クラウド同期エラー:', e);
                    }
                }
            }

            return newProp;
        } finally {
            setOperationInProgress(false);
        }
    };

    const updateProp = async (projectId, propId, propData) => {
        const userId = getUserId();

        // 画像をR2にアップロード（Base64の場合のみ）
        let updatedPropData = { ...propData };

        if (userId !== 'anonymous' && isBase64Image(propData.image)) {
            try {
                updatedPropData.image = await uploadImageToR2(propData.image, userId);
            } catch (e) {
                console.warn('R2アップロード失敗:', e);
            }
        }

        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. 小物を更新
        const newProjects = currentProjects.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId) ? { ...prop, ...updatedPropData } : prop
                    )
                }
                : project
        );

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // 5. 操作時刻を記録（自動同期スキップ用）
        setLastOperationTime(Date.now());

        // 6. クラウドにも同期（完了を待機）
        if (userId !== 'anonymous') {
            const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
            if (updatedProject) {
                try {
                    await projectsApi.update(userId, String(projectId), updatedProject);
                    console.log('小物更新をクラウドに同期完了');
                } catch (e) {
                    console.error('クラウド同期エラー:', e);
                }
            }
        }
    };

    const deleteProp = async (projectId, propId) => {
        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. 小物を削除
        const newProjects = currentProjects.map(project =>
            String(project.id) === String(projectId)
                ? { ...project, props: (project.props || []).filter(prop => String(prop.id) !== String(propId)) }
                : project
        );

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // 5. 操作時刻を記録（自動同期スキップ用）
        setLastOperationTime(Date.now());

        // 6. クラウドにも同期（削除を反映）
        const userId = getUserId();
        if (userId !== 'anonymous') {
            const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
            if (updatedProject) {
                try {
                    await projectsApi.update(userId, String(projectId), updatedProject);
                    console.log('小物削除をクラウドに同期完了');
                } catch (e) {
                    console.error('クラウド同期エラー:', e);
                }
            }
        }
    };

    const togglePropCheck = (projectId, propId) => {
        // 1. 現在のlocalStorageから読み込み
        let currentProjects = [];
        try {
            const saved = localStorage.getItem('shooting-master-projects');
            if (saved) {
                currentProjects = JSON.parse(saved);
            }
        } catch (e) {
            console.log('localStorage読み込み失敗');
        }

        // 2. チェック状態を切り替え
        const newProjects = currentProjects.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId) ? { ...prop, checked: !prop.checked } : prop
                    )
                }
                : project
        );

        // 3. localStorageに即座に保存
        try {
            localStorage.setItem('shooting-master-projects', JSON.stringify(newProjects));
        } catch (error) {
            console.error('localStorage保存エラー:', error);
        }

        // 4. stateを更新
        setProjects(newProjects);

        // 5. クラウドにも同期
        const userId = getUserId();
        if (userId !== 'anonymous') {
            const updatedProject = newProjects.find(p => String(p.id) === String(projectId));
            if (updatedProject) {
                projectsApi.update(userId, String(projectId), updatedProject).catch(console.error);
            }
        }
    };

    // 小物進捗計算
    const getPropsProgress = (projectId) => {
        const project = getProjectById(projectId);
        if (!project || !project.props || project.props.length === 0) return 0;
        const checked = project.props.filter(prop => prop.checked).length;
        return Math.round((checked / project.props.length) * 100);
    };

    // 小物が使用されているカットを取得（型を揃えて比較）
    const getCutsUsingProp = (projectId, propId) => {
        const project = getProjectById(projectId);
        if (!project) return [];
        const normalizedPropId = String(propId);
        return project.cuts.filter(cut =>
            (cut.propIds || []).map(id => String(id)).includes(normalizedPropId)
        );
    };

    // カットで使用する小物を取得（型を揃えて比較）
    const getPropsForCut = (projectId, cutId) => {
        const project = getProjectById(projectId);
        if (!project) return [];
        const cut = project.cuts.find(c => String(c.id) === String(cutId));
        if (!cut) return [];
        const normalizedPropIds = (cut.propIds || []).map(id => String(id));
        return (project.props || []).filter(prop => normalizedPropIds.includes(String(prop.id)));
    };

    // モデルが使用されているカットを取得（型を揃えて比較）
    const getCutsUsingModel = (projectId, modelId) => {
        const project = getProjectById(projectId);
        if (!project) return [];
        const normalizedModelId = String(modelId);
        return project.cuts.filter(cut =>
            (cut.modelIds || []).map(id => String(id)).includes(normalizedModelId)
        );
    };

    // プロジェクトで使用されているモデルIDを取得
    const getModelIdsForProject = (projectId) => {
        const project = getProjectById(projectId);
        if (!project) return [];
        const modelIds = new Set();
        project.cuts.forEach(cut => {
            (cut.modelIds || []).forEach(id => modelIds.add(id));
        });
        return Array.from(modelIds);
    };

    // 進捗計算
    const getProjectProgress = (projectId) => {
        const project = getProjectById(projectId);
        if (!project || !project.cuts || project.cuts.length === 0) return 0;
        const completed = project.cuts.filter(cut => cut.status === 'completed').length;
        return Math.round((completed / project.cuts.length) * 100);
    };

    // ===== 納品関連 =====

    // 商品のドライブURLを設定
    const setProductDriveUrl = (projectId, propId, driveUrl) => {
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId) ? { ...prop, driveUrl } : prop
                    )
                }
                : project
        ));
    };

    // 納品ファイルをアップロード（カメラマン側）
    const uploadDeliveryFiles = (projectId, propId, files) => {
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId)
                            ? {
                                ...prop,
                                delivery: {
                                    ...prop.delivery,
                                    status: 'uploaded',
                                    uploadedAt: new Date().toISOString(),
                                    uploadedFiles: [...(prop.delivery?.uploadedFiles || []), ...files],
                                }
                            }
                            : prop
                    )
                }
                : project
        ));
    };

    // 納品をクライアント確認済みにする
    const approveDelivery = (projectId, propId) => {
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId)
                            ? {
                                ...prop,
                                delivery: {
                                    ...prop.delivery,
                                    status: 'approved',
                                    clientChecked: true,
                                    clientCheckedAt: new Date().toISOString(),
                                }
                            }
                            : prop
                    )
                }
                : project
        ));
    };

    // 修正指示を追加（クライアント側）
    const addRevisionRequest = (projectId, propId, message) => {
        const revision = {
            id: Date.now(),
            message,
            createdAt: new Date().toISOString(),
            resolvedAt: null,
        };
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId)
                            ? {
                                ...prop,
                                delivery: {
                                    ...prop.delivery,
                                    status: 'revision_requested',
                                    clientChecked: false,
                                    revisions: [...(prop.delivery?.revisions || []), revision],
                                }
                            }
                            : prop
                    )
                }
                : project
        ));
    };

    // 修正指示を解決済みにする（カメラマン側）
    const resolveRevision = (projectId, propId, revisionId) => {
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId)
                            ? {
                                ...prop,
                                delivery: {
                                    ...prop.delivery,
                                    revisions: (prop.delivery?.revisions || []).map(rev =>
                                        String(rev.id) === String(revisionId)
                                            ? { ...rev, resolvedAt: new Date().toISOString() }
                                            : rev
                                    ),
                                }
                            }
                            : prop
                    )
                }
                : project
        ));
    };

    // 納品ステータスを更新
    const updateDeliveryStatus = (projectId, propId, status) => {
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId)
                            ? {
                                ...prop,
                                delivery: {
                                    ...prop.delivery,
                                    status,
                                }
                            }
                            : prop
                    )
                }
                : project
        ));
    };

    // 納品ファイルを削除
    const removeDeliveryFile = (projectId, propId, fileIndex) => {
        setProjects(prev => prev.map(project =>
            String(project.id) === String(projectId)
                ? {
                    ...project,
                    props: (project.props || []).map(prop =>
                        String(prop.id) === String(propId)
                            ? {
                                ...prop,
                                delivery: {
                                    ...prop.delivery,
                                    uploadedFiles: (prop.delivery?.uploadedFiles || []).filter((_, idx) => idx !== fileIndex),
                                }
                            }
                            : prop
                    )
                }
                : project
        ));
    };

    // プロジェクトの納品進捗を取得
    const getDeliveryProgress = (projectId) => {
        const project = getProjectById(projectId);
        if (!project) return { total: 0, uploaded: 0, approved: 0, pending: 0, revisionRequested: 0 };

        const products = (project.props || []).filter(p => p.category === 'product');
        const total = products.length;
        const uploaded = products.filter(p => p.delivery?.status === 'uploaded').length;
        const approved = products.filter(p => p.delivery?.status === 'approved').length;
        const revisionRequested = products.filter(p => p.delivery?.status === 'revision_requested').length;
        const pending = total - uploaded - approved - revisionRequested;

        return { total, uploaded, approved, pending, revisionRequested };
    };

    return (
        <ProjectContext.Provider value={{
            projects,
            addProject,
            updateProject,
            deleteProject,
            copyProject,
            getProjectById,
            addCut,
            updateCut,
            deleteCut,
            copyCut,
            getCutById,
            addProp,
            updateProp,
            deleteProp,
            togglePropCheck,
            getPropsProgress,
            getCutsUsingProp,
            getPropsForCut,
            getCutsUsingModel,
            getModelIdsForProject,
            getProjectProgress,
            // 納品関連
            setProductDriveUrl,
            uploadDeliveryFiles,
            approveDelivery,
            addRevisionRequest,
            resolveRevision,
            updateDeliveryStatus,
            removeDeliveryFile,
            getDeliveryProgress,
            // クラウド同期
            syncStatus,
            lastSyncTime,
            fetchFromCloud,
            syncToCloud,
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};
