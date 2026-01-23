// POST /api/images/upload - Upload image to R2

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${userId}/${timestamp}-${randomId}.${extension}`;

    // Upload to R2
    await env.IMAGES.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'image/jpeg',
      },
    });

    // Return the R2 URL
    // Note: You'll need to set up a custom domain or use R2 public access
    const imageUrl = `/images/${filename}`;

    return Response.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
