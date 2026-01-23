/**
 * 画像をリサイズ・圧縮してBase64文字列を返す
 * @param {string} base64String - 元の画像のBase64文字列
 * @param {object} options - オプション
 * @param {number} options.maxWidth - 最大幅 (デフォルト: 800)
 * @param {number} options.maxHeight - 最大高さ (デフォルト: 800)
 * @param {number} options.quality - JPEG品質 0-1 (デフォルト: 0.7)
 * @returns {Promise<string>} - リサイズ後のBase64文字列
 */
export const resizeImage = (base64String, options = {}) => {
    const { maxWidth = 800, maxHeight = 800, quality = 0.7 } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // アスペクト比を維持してリサイズ
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG形式で圧縮（透過がある場合はPNGになるが、写真は通常JPEG）
            const resizedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(resizedBase64);
        };

        img.onerror = (error) => {
            reject(error);
        };

        img.src = base64String;
    });
};

/**
 * FileReaderでファイルを読み込み、リサイズしてBase64を返す
 * @param {File} file - 画像ファイル
 * @param {object} options - リサイズオプション
 * @returns {Promise<string>} - リサイズ後のBase64文字列
 */
export const readAndResizeImage = (file, options = {}) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const resized = await resizeImage(reader.result, options);
                resolve(resized);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
