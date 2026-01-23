// POST /api/sync - Sync all local data to cloud
// This endpoint handles bulk sync from localStorage to D1

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projects, models } = body;

    // Ensure user exists
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id) VALUES (?)'
    ).bind(userId).run();

    // Sync models first (projects may reference them)
    if (models && models.length > 0) {
      for (const model of models) {
        try {
          const modelId = String(model.id);
          // Check if model exists
          const existing = await env.DB.prepare(
            'SELECT id FROM models WHERE id = ?'
          ).bind(modelId).first();

          if (existing) {
            // Update existing
            await env.DB.prepare(
              `UPDATE models SET name = ?, gender = ?, age = ?, height = ?, top_size = ?, bottom_size = ?, shoe_size = ?, model_type = ?, agency_name = ?, portfolio_url = ?, instagram_url = ?, image = ?, memo = ?
               WHERE id = ?`
            ).bind(model.name || '', model.gender || '', model.age || null, model.height || null, model.topSize || '', model.bottomSize || '', model.shoeSize || '', model.modelType || 'agency', model.agencyName || '', model.portfolioUrl || '', model.instagramUrl || '', model.image || '', model.memo || '', modelId).run();
          } else {
            // Insert new
            await env.DB.prepare(
              `INSERT INTO models (id, user_id, name, gender, age, height, top_size, bottom_size, shoe_size, model_type, agency_name, portfolio_url, instagram_url, image, memo, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(modelId, userId, model.name || '', model.gender || '', model.age || null, model.height || null, model.topSize || '', model.bottomSize || '', model.shoeSize || '', model.modelType || 'agency', model.agencyName || '', model.portfolioUrl || '', model.instagramUrl || '', model.image || '', model.memo || '', model.createdAt || new Date().toISOString()).run();
          }
        } catch (modelError) {
          console.error('Error syncing model:', model.id, modelError);
          // Continue with other models
        }
      }
    }

    // Sync projects
    if (projects && projects.length > 0) {
      for (const project of projects) {
        try {
          const projectId = String(project.id);
          // Check if project exists
          const existing = await env.DB.prepare(
            'SELECT id FROM projects WHERE id = ?'
          ).bind(projectId).first();

          if (existing) {
            // Update project
            await env.DB.prepare(
              `UPDATE projects SET name = ?, description = ?, product_image = ?, status = ?, shooting_date = ?, category = ?
               WHERE id = ?`
            ).bind(project.name || '', project.description || '', project.productImage || '', project.status || 'planning', project.shootingDate || '', project.category || '', projectId).run();

            // Clear and re-insert related data
            await env.DB.prepare('DELETE FROM cut_props WHERE cut_id IN (SELECT id FROM cuts WHERE project_id = ?)').bind(projectId).run();
            await env.DB.prepare('DELETE FROM cut_models WHERE cut_id IN (SELECT id FROM cuts WHERE project_id = ?)').bind(projectId).run();
            await env.DB.prepare('DELETE FROM cuts WHERE project_id = ?').bind(projectId).run();
            await env.DB.prepare('DELETE FROM props WHERE project_id = ?').bind(projectId).run();
          } else {
            // Insert new project
            await env.DB.prepare(
              `INSERT INTO projects (id, user_id, name, description, product_image, status, shooting_date, category, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(projectId, userId, project.name || '', project.description || '', project.productImage || '', project.status || 'planning', project.shootingDate || '', project.category || '', project.createdAt || new Date().toISOString()).run();
          }

          // Insert props
          if (project.props && project.props.length > 0) {
            for (const prop of project.props) {
              try {
                const propId = String(prop.id);
                // deliveryがオブジェクトの場合はJSON文字列に変換
                const deliveryStr = typeof prop.delivery === 'object' ? JSON.stringify(prop.delivery) : (prop.delivery || '');
                await env.DB.prepare(
                  `INSERT OR REPLACE INTO props (id, project_id, name, category, image, checked, notes, delivery)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(propId, projectId, prop.name || '', prop.category || '', prop.image || '', prop.checked ? 1 : 0, prop.notes || '', deliveryStr).run();
              } catch (propError) {
                console.error('Error syncing prop:', prop.id, propError);
              }
            }
          }

          // Insert cuts
          if (project.cuts && project.cuts.length > 0) {
            for (const cut of project.cuts) {
              try {
                const cutId = String(cut.id);
                await env.DB.prepare(
                  `INSERT OR REPLACE INTO cuts (id, project_id, title, scene, original_image, ai_generated_image, angle, lighting, comments, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                ).bind(cutId, projectId, cut.title || '', cut.scene || '', cut.originalImage || '', cut.aiGeneratedImage || '', cut.angle || '', cut.lighting || '', cut.comments || '', cut.status || 'draft').run();

                // Insert cut-prop relations
                if (cut.propIds && cut.propIds.length > 0) {
                  for (const propId of cut.propIds) {
                    await env.DB.prepare(
                      'INSERT OR IGNORE INTO cut_props (cut_id, prop_id) VALUES (?, ?)'
                    ).bind(cutId, String(propId)).run();
                  }
                }

                // Insert cut-model relations
                if (cut.modelIds && cut.modelIds.length > 0) {
                  for (const modelId of cut.modelIds) {
                    await env.DB.prepare(
                      'INSERT OR IGNORE INTO cut_models (cut_id, model_id) VALUES (?, ?)'
                    ).bind(cutId, String(modelId)).run();
                  }
                }
              } catch (cutError) {
                console.error('Error syncing cut:', cut.id, cutError);
              }
            }
          }
        } catch (projectError) {
          console.error('Error syncing project:', project.id, projectError);
          // Continue with other projects
        }
      }
    }

    return Response.json({ success: true, message: 'Data synced successfully' });
  } catch (error) {
    console.error('Error syncing data:', error);
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
