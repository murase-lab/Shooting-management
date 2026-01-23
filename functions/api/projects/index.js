// GET /api/projects - Get all projects for user
// POST /api/projects - Create a new project

export async function onRequestGet(context) {
  const { env, request } = context;

  try {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    // Get props and cuts for each project
    const projectsWithDetails = await Promise.all(
      results.map(async (project) => {
        const { results: props } = await env.DB.prepare(
          'SELECT * FROM props WHERE project_id = ?'
        ).bind(project.id).all();

        const { results: cuts } = await env.DB.prepare(
          'SELECT * FROM cuts WHERE project_id = ?'
        ).bind(project.id).all();

        // Get prop and model IDs for each cut
        const cutsWithRelations = await Promise.all(
          cuts.map(async (cut) => {
            const { results: cutProps } = await env.DB.prepare(
              'SELECT prop_id FROM cut_props WHERE cut_id = ?'
            ).bind(cut.id).all();

            const { results: cutModels } = await env.DB.prepare(
              'SELECT model_id FROM cut_models WHERE cut_id = ?'
            ).bind(cut.id).all();

            // Convert snake_case to camelCase for cut
            return {
              id: cut.id,
              title: cut.title,
              scene: cut.scene,
              originalImage: cut.original_image,
              aiGeneratedImage: cut.ai_generated_image,
              angle: cut.angle,
              lighting: cut.lighting,
              comments: cut.comments,
              status: cut.status,
              propIds: cutProps.map(cp => cp.prop_id),
              modelIds: cutModels.map(cm => cm.model_id),
            };
          })
        );

        // Convert snake_case to camelCase for props
        const propsConverted = props.map(prop => {
          // deliveryがJSON文字列の場合はパース
          let delivery = prop.delivery;
          if (typeof delivery === 'string' && delivery) {
            try {
              delivery = JSON.parse(delivery);
            } catch (e) {
              delivery = null;
            }
          }
          return {
            id: prop.id,
            name: prop.name,
            category: prop.category,
            image: prop.image,
            checked: prop.checked === 1,
            notes: prop.notes,
            delivery: delivery,
          };
        });

        // Convert snake_case to camelCase for project
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          productImage: project.product_image,
          status: project.status,
          shootingDate: project.shooting_date,
          category: project.category,
          createdAt: project.created_at,
          props: propsConverted,
          cuts: cutsWithRelations,
        };
      })
    );

    return Response.json(projectsWithDetails);
  } catch (error) {
    console.error('Error fetching projects:', error);
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
    const { id, name, description, productImage, status, shootingDate, category, props, cuts } = body;

    // Ensure user exists
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id) VALUES (?)'
    ).bind(userId).run();

    // Insert project
    await env.DB.prepare(
      `INSERT INTO projects (id, user_id, name, description, product_image, status, shooting_date, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, userId, name, description || '', productImage || '', status || 'planning', shootingDate || '', category || '').run();

    // Insert props
    if (props && props.length > 0) {
      for (const prop of props) {
        await env.DB.prepare(
          `INSERT INTO props (id, project_id, name, category, image, checked, notes, delivery)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(prop.id, id, prop.name, prop.category || '', prop.image || '', prop.checked ? 1 : 0, prop.notes || '', prop.delivery || '').run();
      }
    }

    // Insert cuts
    if (cuts && cuts.length > 0) {
      for (const cut of cuts) {
        await env.DB.prepare(
          `INSERT INTO cuts (id, project_id, title, scene, original_image, ai_generated_image, angle, lighting, comments, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(cut.id, id, cut.title, cut.scene || '', cut.originalImage || '', cut.aiGeneratedImage || '', cut.angle || '', cut.lighting || '', cut.comments || '', cut.status || 'draft').run();

        // Insert cut-prop relations
        if (cut.propIds && cut.propIds.length > 0) {
          for (const propId of cut.propIds) {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO cut_props (cut_id, prop_id) VALUES (?, ?)'
            ).bind(cut.id, propId).run();
          }
        }

        // Insert cut-model relations
        if (cut.modelIds && cut.modelIds.length > 0) {
          for (const modelId of cut.modelIds) {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO cut_models (cut_id, model_id) VALUES (?, ?)'
            ).bind(cut.id, modelId).run();
          }
        }
      }
    }

    return Response.json({ success: true, id });
  } catch (error) {
    console.error('Error creating project:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
