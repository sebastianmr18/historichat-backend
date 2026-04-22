import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedSherlockHolmesCharacter1784000002000 implements MigrationInterface {
  name = "SeedSherlockHolmesCharacter1784000002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insertar personaje si no existe
    await queryRunner.query(`
      INSERT INTO public.app_character (
        name,
        role,
        biography,
        description,
        years,
        category,
        epoch,
        quote,
        ambient_label,
        content_variant,
        key_traits,
        speech_tics,
        topics,
        theme_color,
        theme_color_light,
        is_public,
        vector_db_name
      )
      SELECT
        'Sherlock Holmes',
        'Detective consultor',
        'Sherlock Holmes es la personificación del racionalismo aplicado a la resolución de crímenes, operando desde su icónica residencia en el 221B de Baker Street en Londres. Su figura emerge en la literatura en 1887 con ''Estudio en Escarlata'', transformando para siempre el género policial a través del uso de la ciencia forense, la química y el razonamiento abductivo. A diferencia de los detectives de su época, Holmes desprecia la intuición ciega, prefiriendo la observación minuciosa de detalles aparentemente insignificantes que otros pasan por alto.

Formado en una disciplina intelectual autoinfligida, Holmes posee un conocimiento enciclopédico en áreas específicas como la toxicología, la geología de Londres y la historia criminal, mientras ignora deliberadamente datos que considera irrelevantes para su trabajo, como la teoría heliocéntrica. Su evolución muestra a un hombre que lucha constantemente contra el tedio existencial, lo que en ocasiones lo lleva a estados de melancolía o al consumo de sustancias peligrosas. Su legado trasciende la ficción; los métodos descritos por su creador, Arthur Conan Doyle, influyeron directamente en el desarrollo de técnicas reales de investigación criminalística en Scotland Yard y otras agencias globales. Holmes no es solo un personaje, sino el símbolo de la victoria de la lógica sobre el caos del crimen en la era victoriana y eduardiana.',
        'El detective más famoso del mundo, cuya mente funciona como una máquina de precisión lógica. Especialista en desentrañar misterios imposibles mediante la observación y la ciencia.',
        '1854 - 1927',
        'Literatura',
        'Época Victoriana / Eduardiana',
        'Una vez descartado lo imposible, lo que queda, por improbable que parezca, debe ser la verdad.',
        'Londres, Baker Street, Dartmoor',
        'editorial_v1',
        '["Analítico", "Arrogante", "Observador", "Melancólico", "Metódico"]'::jsonb,
        '["Elemental", "Usted ve, pero no observa", "¡El juego ha comenzado!"]'::jsonb,
        '["Razonamiento deductivo", "Ciencia forense", "Química analítica", "Criminología", "Psicología del criminal"]'::jsonb,
        '#2A2A2A',
        '#8B4513',
        true,
        ''
      WHERE NOT EXISTS (
        SELECT 1 FROM public.app_character WHERE name = 'Sherlock Holmes'
      )
    `);

    // Actualizar personaje si ya existe
    await queryRunner.query(`
      UPDATE public.app_character
      SET
        role = 'Detective consultor',
        biography = 'Sherlock Holmes es la personificación del racionalismo aplicado a la resolución de crímenes, operando desde su icónica residencia en el 221B de Baker Street en Londres. Su figura emerge en la literatura en 1887 con ''Estudio en Escarlata'', transformando para siempre el género policial a través del uso de la ciencia forense, la química y el razonamiento abductivo. A diferencia de los detectives de su época, Holmes desprecia la intuición ciega, prefiriendo la observación minuciosa de detalles aparentemente insignificantes que otros pasan por alto.

Formado en una disciplina intelectual autoinfligida, Holmes posee un conocimiento enciclopédico en áreas específicas como la toxicología, la geología de Londres y la historia criminal, mientras ignora deliberadamente datos que considera irrelevantes para su trabajo, como la teoría heliocéntrica. Su evolución muestra a un hombre que lucha constantemente contra el tedio existencial, lo que en ocasiones lo lleva a estados de melancolía o al consumo de sustancias peligrosas. Su legado trasciende la ficción; los métodos descritos por su creador, Arthur Conan Doyle, influyeron directamente en el desarrollo de técnicas reales de investigación criminalística en Scotland Yard y otras agencias globales. Holmes no es solo un personaje, sino el símbolo de la victoria de la lógica sobre el caos del crimen en la era victoriana y eduardiana.',
        description = 'El detective más famoso del mundo, cuya mente funciona como una máquina de precisión lógica. Especialista en desentrañar misterios imposibles mediante la observación y la ciencia.',
        years = '1854 - 1927',
        category = 'Literatura',
        epoch = 'Época Victoriana / Eduardiana',
        quote = 'Una vez descartado lo imposible, lo que queda, por improbable que parezca, debe ser la verdad.',
        ambient_label = 'Londres, Baker Street, Dartmoor',
        content_variant = 'editorial_v1',
        key_traits = '["Analítico", "Arrogante", "Observador", "Melancólico", "Metódico"]'::jsonb,
        speech_tics = '["Elemental", "Usted ve, pero no observa", "¡El juego ha comenzado!"]'::jsonb,
        topics = '["Razonamiento deductivo", "Ciencia forense", "Química analítica", "Criminología", "Psicología del criminal"]'::jsonb,
        theme_color = '#2A2A2A',
        theme_color_light = '#8B4513'
      WHERE name = 'Sherlock Holmes'
    `);

    // Insertar o actualizar citas
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(sort_order, is_featured, text, attribution) AS (
        VALUES
          (0, true, 'Una vez descartado lo imposible, lo que queda, por improbable que parezca, debe ser la verdad.', 'Sherlock Holmes'),
          (1, false, 'Usted ve, pero no observa. La distinción es clara.', 'Sherlock Holmes'),
          (2, false, 'Soy un cerebro, Watson. El resto de mí es un mero apéndice.', 'Sherlock Holmes'),
          (3, false, 'No hay nada más engañoso que un hecho obvio.', 'Sherlock Holmes')
      )
      INSERT INTO public.app_character_quote (character_id, text, attribution, sort_order, is_featured)
      SELECT target_character.id, seed_data.text, seed_data.attribution, seed_data.sort_order, seed_data.is_featured
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        text = EXCLUDED.text,
        attribution = EXCLUDED.attribution,
        is_featured = EXCLUDED.is_featured
    `);

    // Insertar o actualizar datos rápidos (facts)
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(section_key, sort_order, label, value) AS (
        VALUES
          ('quick_facts', 0, 'Origen', '221B Baker Street, Londres, Reino Unido.'),
          ('quick_facts', 1, 'Método', 'Razonamiento abductivo y observación de detalles forenses.'),
          ('quick_facts', 2, 'Instrumento', 'Violín Stradivarius, utilizado para la introspección.'),
          ('quick_facts', 3, 'Especialidad', 'Criminología, química analítica y disfraces.')
      )
      INSERT INTO public.app_character_fact (character_id, label, value, section_key, sort_order)
      SELECT target_character.id, seed_data.label, seed_data.value, seed_data.section_key, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, section_key, sort_order) DO UPDATE SET
        label = EXCLUDED.label,
        value = EXCLUDED.value
    `);

    // Insertar o actualizar tarjetas de contexto
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(page_key, sort_order, eyebrow, title, body, icon_key) AS (
        VALUES
          ('overview', 0, 'Marco Intelectual', 'La Ciencia de la Deducción', 'Holmes considera que el cerebro es como un pequeño ático vacío que uno debe amueblar con cuidado. No almacena información inútil para su profesión.', 'lightbulb'),
          ('overview', 1, 'Legado Histórico', 'Impacto en la Criminología Real', 'Sus métodos de análisis de huellas dactilares y balística precedieron a muchas prácticas estándar de la policía científica moderna.', 'globe'),
          ('conversation', 0, 'Guía de Interacción', 'Cómo conversar con un genio', 'Evite las trivialidades y las emociones excesivas. Presente hechos concretos y desafíe su intelecto con enigmas complejos.', 'sparkles')
      )
      INSERT INTO public.app_character_context_card (character_id, eyebrow, title, body, icon_key, page_key, sort_order)
      SELECT target_character.id, seed_data.eyebrow, seed_data.title, seed_data.body, seed_data.icon_key, seed_data.page_key, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, page_key, sort_order) DO UPDATE SET
        eyebrow = EXCLUDED.eyebrow,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        icon_key = EXCLUDED.icon_key
    `);

    // Insertar o actualizar entradas de timeline
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(sort_order, year_label, phase_label, title, description, narrative_text) AS (
        VALUES
          (0, '1881', 'Formación', 'Encuentro con el Dr. John Watson', 'Holmes y Watson deciden compartir piso en Baker Street.', 'Este evento marca el inicio de la crónica de sus casos. Watson se convierte en el ancla humana de Holmes y el biógrafo que documenta su genialidad ante el público.'),
          (1, '1888', 'Consolidación', 'El Escándalo en Bohemia', 'Holmes se enfrenta a Irene Adler.', 'Es uno de los pocos casos donde Holmes es superado intelectualmente. Adler se convierte en la única mujer a la que Holmes respeta profundamente, refiriéndose a ella siempre como ''La Mujer''.'),
          (2, '1891', 'Crisis', 'El Problema Final', 'Supuesta muerte de Holmes en las cataratas de Reichenbach.', 'En un enfrentamiento mortal con el profesor Moriarty, Holmes desaparece. Este evento fue un intento de su creador por finalizar la serie debido al agotamiento literario.'),
          (3, '1894', 'Retorno', 'La Casa Deshabitada', 'Holmes reaparece en Londres tras tres años de ausencia.', 'Tras viajar por el mundo bajo identidades falsas, Holmes regresa para desmantelar los restos de la organización de Moriarty, satisfaciendo la demanda masiva de los lectores.')
      )
      INSERT INTO public.app_character_timeline_entry (character_id, year_label, phase_label, title, description, narrative_text, sort_order)
      SELECT target_character.id, seed_data.year_label, seed_data.phase_label, seed_data.title, seed_data.description, seed_data.narrative_text, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        year_label = EXCLUDED.year_label,
        phase_label = EXCLUDED.phase_label,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        narrative_text = EXCLUDED.narrative_text
    `);

    // Insertar o actualizar relaciones
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(sort_order, name, role, dynamic) AS (
        VALUES
          (0, 'Dr. John Watson', 'Compañero y biógrafo', 'Watson aporta la calidez humana y la perspectiva moral que equilibra la frialdad analítica de Holmes.'),
          (1, 'Profesor James Moriarty', 'Némesis', 'El ''Napoleón del crimen''. Es el único rival que Holmes considera su igual en capacidad intelectual.'),
          (2, 'Mycroft Holmes', 'Hermano mayor', 'Posee facultades deductivas superiores a las de Sherlock, pero carece de la energía para aplicarlas al campo.')
      )
      INSERT INTO public.app_character_relationship (character_id, name, role, dynamic, sort_order)
      SELECT target_character.id, seed_data.name, seed_data.role, seed_data.dynamic, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        dynamic = EXCLUDED.dynamic
    `);

    // Insertar relaciones entre timeline y relationships (many-to-many)
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      mapping(timeline_sort_order, relationship_sort_order) AS (
        VALUES
          (0, 0),
          (2, 1)
      ),
      timeline_rows AS (
        SELECT timeline_entry.id, timeline_entry.sort_order
        FROM public.app_character_timeline_entry timeline_entry
        JOIN target_character ON target_character.id = timeline_entry.character_id
      ),
      relationship_rows AS (
        SELECT relationship.id, relationship.sort_order
        FROM public.app_character_relationship relationship
        JOIN target_character ON target_character.id = relationship.character_id
      )
      INSERT INTO public.app_character_timeline_relationship (timeline_entry_id, relationship_id)
      SELECT timeline_rows.id, relationship_rows.id
      FROM mapping
      JOIN timeline_rows ON timeline_rows.sort_order = mapping.timeline_sort_order
      JOIN relationship_rows ON relationship_rows.sort_order = mapping.relationship_sort_order
      ON CONFLICT (timeline_entry_id, relationship_id) DO NOTHING
    `);

    // Insertar o actualizar prompts de conversación
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(sort_order, label, prompt, note, cta_label) AS (
        VALUES
          (0, 'Método deductivo', '¿Podría explicarme los principios fundamentales de su método de observación?', 'Permite explorar la filosofía analítica del personaje y su desprecio por la conjetura.', 'Inicio'),
          (1, 'Profesor Moriarty', 'Holmes, ¿qué es lo que hace de Moriarty un adversario tan formidable?', 'Indaga en la visión de Holmes sobre el mal intelectualizado y la rivalidad estratégica.', 'Inicio'),
          (2, 'La naturaleza humana', '¿Cómo logra mantener la objetividad cuando las emociones humanas nublan un caso?', 'Explora el desapego emocional de Holmes y su visión cínica pero precisa de la sociedad.', 'Inicio')
      )
      INSERT INTO public.app_character_prompt (character_id, label, prompt, note, cta_label, sort_order)
      SELECT target_character.id, seed_data.label, seed_data.prompt, seed_data.note, seed_data.cta_label, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        label = EXCLUDED.label,
        prompt = EXCLUDED.prompt,
        note = EXCLUDED.note,
        cta_label = EXCLUDED.cta_label
    `);

    // Insertar o actualizar imágenes de galería
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(sort_order, is_cover, image_url, alt, caption, credit, source_url) AS (
        VALUES
          (0, true, 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Sidney_Paget_Sherlock_Holmes_Portrait.png', 'Retrato de Sherlock Holmes por Sidney Paget', 'Ilustración clásica que definió la apariencia visual de Holmes, incluyendo la gorra deerstalker y la capa Inverness.', 'Sidney Paget, The Strand Magazine, 1891', NULL),
          (1, false, 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Sherlock_Holmes_and_Professor_Moriarty_at_the_Reichenbach_Falls.jpg', 'Sherlock Holmes y Moriarty en Reichenbach', 'El enfrentamiento final entre las dos mentes más brillantes de su tiempo en Suiza.', 'Sidney Paget, 1893', NULL)
      )
      INSERT INTO public.app_character_gallery_image (character_id, image_url, alt, caption, credit, source_url, sort_order, is_cover)
      SELECT target_character.id, seed_data.image_url, seed_data.alt, seed_data.caption, seed_data.credit, seed_data.source_url, seed_data.sort_order, seed_data.is_cover
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        image_url = EXCLUDED.image_url,
        alt = EXCLUDED.alt,
        caption = EXCLUDED.caption,
        credit = EXCLUDED.credit,
        source_url = EXCLUDED.source_url,
        is_cover = EXCLUDED.is_cover
    `);

    // Insertar o actualizar bloques editoriales
    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Sherlock Holmes'
      ),
      seed_data(block_key, title, body, page_key, sort_order) AS (
        VALUES
          ('overview_intro', 'La Mente Detrás del Mito', 'Sherlock Holmes no es simplemente un detective; es un experimento de racionalismo puro llevado al límite de la capacidad humana.', 'overview', 0),
          ('voice_description', 'Estilo de Conversación', 'Espere respuestas directas, a menudo cortantes, centradas exclusivamente en la lógica y la evidencia factual.', 'conversation', 0)
      )
      INSERT INTO public.app_character_editorial_block (character_id, block_key, title, body, page_key, sort_order)
      SELECT target_character.id, seed_data.block_key, seed_data.title, seed_data.body, seed_data.page_key, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, block_key) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        page_key = EXCLUDED.page_key,
        sort_order = EXCLUDED.sort_order
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar en orden inverso para respetar foreign keys

    // 1. Eliminar bloques editoriales
    await queryRunner.query(`
      DELETE FROM public.app_character_editorial_block editorial_block
      USING public.app_character character
      WHERE editorial_block.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 2. Eliminar imágenes de galería
    await queryRunner.query(`
      DELETE FROM public.app_character_gallery_image gallery_image
      USING public.app_character character
      WHERE gallery_image.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 3. Eliminar prompts
    await queryRunner.query(`
      DELETE FROM public.app_character_prompt prompt
      USING public.app_character character
      WHERE prompt.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 4. Eliminar relaciones timeline-relationship (many-to-many)
    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_relationship timeline_relationship
      USING public.app_character_timeline_entry timeline_entry, public.app_character character
      WHERE timeline_relationship.timeline_entry_id = timeline_entry.id
        AND timeline_entry.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 5. Eliminar relaciones
    await queryRunner.query(`
      DELETE FROM public.app_character_relationship relationship
      USING public.app_character character
      WHERE relationship.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 6. Eliminar entradas de timeline
    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_entry timeline_entry
      USING public.app_character character
      WHERE timeline_entry.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 7. Eliminar tarjetas de contexto
    await queryRunner.query(`
      DELETE FROM public.app_character_context_card context_card
      USING public.app_character character
      WHERE context_card.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 8. Eliminar facts
    await queryRunner.query(`
      DELETE FROM public.app_character_fact fact
      USING public.app_character character
      WHERE fact.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 9. Eliminar quotes
    await queryRunner.query(`
      DELETE FROM public.app_character_quote quote
      USING public.app_character character
      WHERE quote.character_id = character.id
        AND character.name = 'Sherlock Holmes'
    `);

    // 10. Eliminar el personaje principal
    await queryRunner.query(`
      DELETE FROM public.app_character
      WHERE name = 'Sherlock Holmes'
    `);
  }
}
