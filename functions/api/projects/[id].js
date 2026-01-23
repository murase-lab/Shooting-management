// GET /api/projects/:id - Get a single project
// PUT /api/projects/:id - Update a project
// DELETE /api/projects/:id - Delete a project

export async function onRequestGet(context) {
  const { env, request, params } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const project = await env.DB.prepare(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get props
    const { results: props } = await env.DB.prepare(
      'SELECT * FROM props WHERE project_id = ?'
    ).bind(id).all();

    // Get cuts with relations
    const { results: cuts } = await env.DB.prepare(
      'SELECT * FROM cuts WHERE project_id = ?'
    ).bind(id).all();

    const cutsWithRelations = await Promise.all(
      cuts.map(async (cut) => {
        const { results: cutProps } = await env.DB.prepare(
          'SELECT prop_id FROM cut_props WHERE cut_id = ?'
        ).bind(cut.id).all();

        const { results: cutModels } = await env.DB.prepare(
          'SELECT model_id FROM cut_models WHERE cut_id = ?'
        ).bind(cut.id).all();

        return {
          ...cut,
          propIds: cutProps.map(cp => cp.prop_id),
          modelIds: cutModels.map(cm => cm.model_id),
        };
      })
    );

    return Response.json({
      ...project,
      props,
      cuts: cutsWithRelations,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
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
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!existing) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const { name, description, productImage, status, shootingDate, category, props, cuts } = body;

    // Update project
    await env.DB.prepare(
      `UPDATE projects SET name = ?, description = ?, product_image = ?, status = ?, shooting_date = ?, category = ?
       WHERE id = ?`
    ).bind(name, description || '', productImage || '', status || 'planning', shootingDate || '', category || '', id).run();

    // Delete existing props and cuts
    await env.DB.prepare('DELETE FROM props WHERE project_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM cut_props WHERE cut_id IN (SELECT id FROM cuts WHERE project_id = ?)').bind(id).run();
    await env.DB.prepare('DELETE FROM cut_models WHERE cut_id IN (SELECT id FROM cuts WHERE project_id = ?)').bind(id).run();
    await env.DB.prepare('DELETE FROM cuts WHERE project_id = ?').bind(id).run();

    // Re-insert props
    if (props && props.length > 0) {
      for (const prop of props) {
        await env.DB.prepare(
          `INSERT INTO props (id, project_id, name, category, image, checked, notes, delivery)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(prop.id, id, prop.name, prop.category || '', prop.image || '', prop.checked ? 1 : 0, prop.notes || '', prop.delivery || '').run();
      }
    }

    // Re-insert cuts
    if (cuts && cuts.length > 0) {
      for (const cut of cuts) {
        await env.DB.prepare(
          `INSERT INTO cuts (id, project_id, title, scene, original_image, ai_generated_image, angle, lighting, comments, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(cut.id, id, cut.title, cut.scene || '', cut.originalImage || '', cut.aiGeneratedImage || '', cut.angle || '', cut.lighting || '', cut.comments || '', cut.status || 'draft').run();

        if (cut.propIds && cut.propIds.length > 0) {
          for (const propId of cut.propIds) {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO cut_props (cut_id, prop_id) VALUES (?, ?)'
            ).bind(cut.id, propId).run();
          }
        }

        if (cut.modelIds && cut.modelIds.length > 0) {
          for (const modelId of cut.modelIds) {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO cut_models (cut_id, model_id) VALUES (?, ?)'
            ).bind(cut.id, modelId).run();
          }
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
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
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(id, userId).first();

    if (!existing) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Delete (cascades to props, cuts due to foreign keys)
    await env.DB.prepare('DELETE FROM cut_props WHERE cut_id IN (SELECT id FROM cuts WHERE project_id = ?)').bind(id).run();
    await env.DB.prepare('DELETE FROM cut_models WHERE cut_id IN (SELECT id FROM cuts WHERE project_id = ?)').bind(id).run();
    await env.DB.prepare('DELETE FROM cuts WHERE project_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM props WHERE project_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
