/**
 * 画像を圧縮してBase64文字列を返す
 * @param {string} base64Image - 元のBase64画像データ
 * @param {number} maxWidth - 最大幅（デフォルト: 400px）
 * @param {number} quality - JPEG品質（0-1、デフォルト: 0.7）
 * @returns {Promise<string>} 圧縮後のBase64画像データ
 */
export const compressImage = (base64Image, maxWidth = 400, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        // 画像がない場合はそのまま返す
        if (!base64Image) {
            resolve(null);
            return;
        }

        // 既にURLの場合（http://やhttps://で始まる）はそのまま返す
        if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
            resolve(base64Image);
            return;
        }

        const img = new Image();
        img.onload = () => {
            // キャンバスを作成
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // アスペクト比を維持してリサイズ
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // 画像を描画
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG形式で圧縮
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

            console.log(`【画像圧縮】${Math.round(base64Image.length / 1024)}KB → ${Math.round(compressedBase64.length / 1024)}KB`);

            resolve(compressedBase64);
        };

        img.onerror = (error) => {
            console.error('画像の読み込みに失敗:', error);
            // エラー時は元の画像をそのまま返す
            resolve(base64Image);
        };

        img.src = base64Image;
    });
};

/**
 * 画像サイズをチェックして、大きすぎる場合は圧縮する
 * @param {string} base64Image - Base64画像データ
 * @param {number} maxSizeKB - 最大サイズ（KB、デフォルト: 100KB）
 * @returns {Promise<string>} 圧縮後のBase64画像データ
 */
export const ensureImageSize = async (base64Image, maxSizeKB = 100) => {
    if (!base64Image) return null;

    // URLの場合はそのまま返す
    if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
        return base64Image;
    }

    const currentSizeKB = base64Image.length / 1024;

    if (currentSizeKB <= maxSizeKB) {
        return base64Image;
    }

    // サイズに応じて圧縮パラメータを調整
    let maxWidth = 400;
    let quality = 0.7;

    if (currentSizeKB > 1000) {
        // 1MB以上の場合はより強い圧縮
        maxWidth = 300;
        quality = 0.5;
    } else if (currentSizeKB > 500) {
        maxWidth = 350;
        quality = 0.6;
    }

    return compressImage(base64Image, maxWidth, quality);
};
