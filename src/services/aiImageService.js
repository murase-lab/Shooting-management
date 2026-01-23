import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini APIキーを取得
const getApiKey = () => {
    const settings = JSON.parse(localStorage.getItem('shooting-master-settings') || '{}');
    return settings.geminiApiKey || '';
};

// 設定からAIモデルを取得
const getAiModel = () => {
    const settings = JSON.parse(localStorage.getItem('shooting-master-settings') || '{}');
    return settings.aiModel || 'gemini-2.0-flash-exp';
};

// 画像をBase64に変換
const imageToBase64 = async (imageUrl) => {
    // Data URLの場合はそのまま使用
    if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        const mimeType = imageUrl.split(';')[0].split(':')[1];
        return { base64: base64Data, mimeType };
    }

    // URLから画像を取得してBase64に変換
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({ base64: base64Data, mimeType: blob.type || 'image/jpeg' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// AI画像生成（NanoBanana Pro / Gemini 3 Pro Image）
export const generateImage = async (prompt, referenceImage = null) => {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw new Error('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 設定から選択されたモデルを使用
    const modelName = getAiModel();

    // 画像生成対応モデルの設定
    const imageGenerationModels = ['gemini-2.0-flash-exp', 'gemini-3-pro-image-preview'];
    const supportsImageGeneration = imageGenerationModels.includes(modelName);

    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: supportsImageGeneration ? {
            responseModalities: ['TEXT', 'IMAGE'],
        } : undefined
    });

    try {
        let content;

        if (referenceImage) {
            // 参照画像がある場合
            const imageData = await imageToBase64(referenceImage);
            content = [
                {
                    inlineData: {
                        mimeType: imageData.mimeType,
                        data: imageData.base64
                    }
                },
                { text: `この画像を参考に、以下の指示に従って撮影イメージ画像を生成してください。プロフェッショナルな商品撮影のイメージで生成してください。\n\n指示: ${prompt}` }
            ];
        } else {
            // テキストのみ
            content = `プロフェッショナルな商品撮影のイメージ画像を生成してください。\n\n指示: ${prompt}`;
        }

        const result = await model.generateContent(content);
        const response = result.response;

        // 画像データを抽出
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    // 画像データをData URLとして返す
                    const base64Image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    return {
                        success: true,
                        imageUrl: base64Image,
                        model: modelName
                    };
                }
            }
        }

        // 画像が生成されなかった場合（テキストのみの応答）
        const text = response.text();
        throw new Error(`画像生成に失敗しました。モデルの応答: ${text?.slice(0, 200) || '応答なし'}`);

    } catch (error) {
        console.error('AI Image Generation Error:', error);

        // エラーメッセージをより分かりやすく
        if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
            throw new Error('APIキーが無効です。設定画面で正しいGemini APIキーを入力してください。');
        }

        if (error.message?.includes('PERMISSION_DENIED')) {
            throw new Error('APIキーの権限が不足しています。Gemini APIの画像生成が有効になっているか確認してください。');
        }

        if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
            throw new Error('APIの利用制限に達しました。しばらく待ってから再試行してください。');
        }

        if (error.message?.includes('model') && error.message?.includes('not found')) {
            throw new Error('画像生成モデルが利用できません。Gemini APIの画像生成機能が有効になっているか確認してください。');
        }

        throw error;
    }
};

// 撮影指示からプロンプトを生成するヘルパー
export const buildImagePrompt = (cutData, productInfo = null) => {
    const parts = [];

    if (cutData.title) {
        parts.push(`撮影カット: ${cutData.title}`);
    }

    if (productInfo?.name) {
        parts.push(`商品: ${productInfo.name}`);
    }

    if (cutData.angle) {
        parts.push(`アングル: ${cutData.angle}`);
    }

    if (cutData.lighting) {
        parts.push(`ライティング: ${cutData.lighting}`);
    }

    if (cutData.comments) {
        parts.push(`撮影指示: ${cutData.comments}`);
    }

    // デフォルトのスタイル指示
    parts.push('スタイル: プロフェッショナルな商品撮影、高品質、クリーンな背景');

    return parts.join('\n');
};
