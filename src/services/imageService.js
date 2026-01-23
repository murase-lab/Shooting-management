/**
 * R2画像ストレージサービス
 * 画像をCloudflare R2にアップロードし、URLを返す
 */

const API_BASE = '/api';

/**
 * Base64画像をR2にアップロードしてURLを返す
 * @param {string} base64Image - Base64エンコードされた画像データ
 * @param {string} userId - ユーザーID
 * @returns {Promise<string>} - R2の画像URL
 */
export const uploadImageToR2 = async (base64Image, userId = 'anonymous') => {
  // 空またはURL形式の場合はそのまま返す
  if (!base64Image) return '';
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://') || base64Image.startsWith('/images/')) {
    return base64Image;
  }

  try {
    // Base64をBlobに変換
    const blob = base64ToBlob(base64Image);

    // FormDataを作成
    const formData = new FormData();
    formData.append('file', blob, `image-${Date.now()}.jpg`);

    // R2にアップロード
    const response = await fetch(`${API_BASE}/images/upload`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.url) {
      console.log(`画像をR2にアップロード: ${result.url}`);
      return result.url;
    }

    throw new Error(result.error || 'Upload failed');
  } catch (error) {
    console.error('R2アップロードエラー:', error);
    // エラー時は元のBase64を返す（フォールバック）
    return base64Image;
  }
};

/**
 * Base64文字列をBlobに変換
 * @param {string} base64 - Base64文字列
 * @returns {Blob} - Blobオブジェクト
 */
const base64ToBlob = (base64) => {
  // data:image/jpeg;base64,XXXXX の形式から分離
  const parts = base64.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(parts[1]);

  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
};

/**
 * 画像がBase64かどうかをチェック
 * @param {string} image - 画像データ
 * @returns {boolean} - Base64ならtrue
 */
export const isBase64Image = (image) => {
  return image && image.startsWith('data:');
};

/**
 * 画像がR2 URLかどうかをチェック
 * @param {string} image - 画像データ
 * @returns {boolean} - R2 URLならtrue
 */
export const isR2Url = (image) => {
  return image && image.startsWith('/images/');
};

/**
 * プロジェクト内の全Base64画像をR2にアップロードして置換
 * @param {Object} project - プロジェクトデータ
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} - 画像URLが置換されたプロジェクト
 */
export const uploadProjectImagesToR2 = async (project, userId) => {
  const updatedProject = { ...project };

  // プロジェクト画像
  if (isBase64Image(updatedProject.productImage)) {
    updatedProject.productImage = await uploadImageToR2(updatedProject.productImage, userId);
  }

  // カット画像
  if (updatedProject.cuts && updatedProject.cuts.length > 0) {
    updatedProject.cuts = await Promise.all(
      updatedProject.cuts.map(async (cut) => {
        const updatedCut = { ...cut };
        if (isBase64Image(cut.originalImage)) {
          updatedCut.originalImage = await uploadImageToR2(cut.originalImage, userId);
        }
        if (isBase64Image(cut.aiGeneratedImage)) {
          updatedCut.aiGeneratedImage = await uploadImageToR2(cut.aiGeneratedImage, userId);
        }
        return updatedCut;
      })
    );
  }

  // 小物画像
  if (updatedProject.props && updatedProject.props.length > 0) {
    updatedProject.props = await Promise.all(
      updatedProject.props.map(async (prop) => {
        if (isBase64Image(prop.image)) {
          return { ...prop, image: await uploadImageToR2(prop.image, userId) };
        }
        return prop;
      })
    );
  }

  return updatedProject;
};

/**
 * モデルの画像をR2にアップロード
 * @param {Object} model - モデルデータ
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>} - 画像URLが置換されたモデル
 */
export const uploadModelImageToR2 = async (model, userId) => {
  if (isBase64Image(model.image)) {
    return { ...model, image: await uploadImageToR2(model.image, userId) };
  }
  return model;
};
