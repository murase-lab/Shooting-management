// GET /api/models - Get all models for user
// POST /api/models - Create a new model

export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM models WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    // Convert snake_case to camelCase for frontend compatibility
    const models = results.map(model => ({
      id: model.id,
      name: model.name,
      gender: model.gender,
      age: model.age,
      height: model.height,
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
    }));

    return Response.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, gender, age, height, topSize, bottomSize, shoeSize, modelType, agencyName, portfolioUrl, instagramUrl, image, memo } = body;

    // Ensure user exists
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id) VALUES (?)'
    ).bind(userId).run();

    // Insert or replace model (allows re-saving if sync conflict occurs)
    await env.DB.prepare(
      `INSERT OR REPLACE INTO models (id, user_id, name, gender, age, height, top_size, bottom_size, shoe_size, model_type, agency_name, portfolio_url, instagram_url, image, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM models WHERE id = ?), CURRENT_TIMESTAMP))`
    ).bind(id, userId, name, gender || '', age || null, height || null, topSize || '', bottomSize || '', shoeSize || '', modelType || 'agency', agencyName || '', portfolioUrl || '', instagramUrl || '', image || '', memo || '', id).run();

    return Response.json({ success: true, id });
  } catch (error) {
    console.error('Error creating model:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
