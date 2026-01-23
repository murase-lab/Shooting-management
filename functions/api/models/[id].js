// GET /api/models/:id - Get a single model
// PUT /api/models/:id - Update a model
// DELETE /api/models/:id - Delete a model

export async function onRequestGet(context) {
  const { env, request, params } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const model = await env.DB.prepare(
      'SELECT * FROM models WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!model) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    // Convert snake_case to camelCase
    return Response.json({
      id: model.id,
      name: model.name,
      gender: model.gender,
      age: model.age,
      topSize: model.top_size,
      bottomSize: model.bottom_size,
      shoeSize: model.shoe_size,
      modelType: model.model_type,
      agencyName: model.agency_name,
      portfolioUrl: model.portfolio_url,
      instagramUrl: model.instagram_url,
      image: model.image,
      memo: model.memo,
      createdAt: model.created_at,
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { env, request, params } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Verify ownership
    const existing = await env.DB.prepare(
      'SELECT id FROM models WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!existing) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    const { name, gender, age, height, topSize, bottomSize, shoeSize, modelType, agencyName, portfolioUrl, instagramUrl, image, memo } = body;

    await env.DB.prepare(
      `UPDATE models SET name = ?, gender = ?, age = ?, height = ?, top_size = ?, bottom_size = ?, shoe_size = ?, model_type = ?, agency_name = ?, portfolio_url = ?, instagram_url = ?, image = ?, memo = ?
       WHERE id = ?`
    ).bind(name, gender || '', age || null, height || null, topSize || '', bottomSize || '', shoeSize || '', modelType || 'agency', agencyName || '', portfolioUrl || '', instagramUrl || '', image || '', memo || '', id).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating model:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { env, request, params } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify ownership
    const existing = await env.DB.prepare(
      'SELECT id FROM models WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!existing) {
      return Response.json({ error: 'Model not found' }, { status: 404 });
    }

    // Delete cut-model relations first
    await env.DB.prepare('DELETE FROM cut_models WHERE model_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM models WHERE id = ?').bind(id).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting model:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
