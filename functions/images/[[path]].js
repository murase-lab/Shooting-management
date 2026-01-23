// GET /images/* - Serve images from R2

export async function onRequestGet(context) {
  const { env, params } = context;

  try {
    // パスを結合（配列の場合があるため）
    const path = Array.isArray(params.path) ? params.path.join('/') : params.path;

    if (!path) {
      return new Response('Not found', { status: 404 });
    }

    // R2からオブジェクトを取得
    const object = await env.IMAGES.get(path);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    // レスポンスヘッダー
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1年キャッシュ
    headers.set('ETag', object.etag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
