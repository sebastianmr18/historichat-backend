import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedAlbertEinsteinEditorialPrototype1781000003000 implements MigrationInterface {
  name = "SeedAlbertEinsteinEditorialPrototype1781000003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        target_count integer;
      BEGIN
        SELECT COUNT(*) INTO target_count
        FROM public.app_character
        WHERE name = 'Albert Einstein';

        IF target_count <> 1 THEN
          RAISE EXCEPTION 'Expected exactly one Albert Einstein character, found %', target_count;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        ambient_label = 'Berna, Zurich, Princeton',
        content_variant = 'editorial_v1',
        description = 'Albert Einstein fue uno de los grandes arquitectos de la física moderna. Su trabajo sobre la relatividad, la luz y la estructura del universo transformó la ciencia del siglo XX y lo convirtió también en una voz pública sobre guerra, paz y responsabilidad moral.',
        quote = 'La imaginación es más importante que el conocimiento. El conocimiento es limitado; la imaginación rodea el mundo.',
        years = CASE
          WHEN NULLIF(BTRIM(years), '') IS NULL THEN '1879 - 1955'
          ELSE years
        END,
        role = CASE
          WHEN NULLIF(BTRIM(role), '') IS NULL THEN 'Fisico teorico'
          ELSE role
        END,
        category = CASE
          WHEN NULLIF(BTRIM(category), '') IS NULL THEN 'Ciencia'
          ELSE category
        END,
        key_traits = CASE
          WHEN key_traits IS NULL OR key_traits = '[]'::jsonb THEN '["Claro", "Curioso", "Reflexivo", "Irónico por momentos", "Didáctico sin simplismo"]'::jsonb
          ELSE key_traits
        END
      WHERE name = 'Albert Einstein'
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(sort_order, is_featured, text, attribution) AS (
        VALUES
          (0, true, 'La imaginación es más importante que el conocimiento. El conocimiento es limitado; la imaginación rodea el mundo.', 'Albert Einstein'),
          (1, false, 'Lo importante es no dejar de hacerse preguntas. La curiosidad tiene su propia razón de existir.', 'Albert Einstein'),
          (2, false, 'La vida es como andar en bicicleta. Para mantener el equilibrio, debes seguir moviéndote.', 'Albert Einstein'),
          (3, false, 'No podemos resolver nuestros problemas con la misma forma de pensar que usamos al crearlos.', 'Albert Einstein')
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(section_key, sort_order, label, value) AS (
        VALUES
          ('quick_facts', 0, 'Origen', 'Ulm, Imperio alemán'),
          ('quick_facts', 1, 'Época activa', '1905 - 1955'),
          ('quick_facts', 2, 'Rasgo intelectual', 'Curiosidad radical y claridad conceptual'),
          ('quick_facts', 3, 'Intereses persistentes', 'Tiempo, luz, gravedad, paz y responsabilidad')
      )
      INSERT INTO public.app_character_fact (character_id, label, value, section_key, sort_order)
      SELECT target_character.id, seed_data.label, seed_data.value, seed_data.section_key, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, section_key, sort_order) DO UPDATE SET
        label = EXCLUDED.label,
        value = EXCLUDED.value
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(page_key, sort_order, eyebrow, title, body, icon_key) AS (
        VALUES
          ('overview', 0, 'Biografía histórica', 'Brillantez, exilio y conflicto', 'Su vida no fue la de un sabio aislado. Vivió el ascenso del nazismo, abandonó Alemania en 1933, se instaló en Princeton y tuvo que pensar públicamente qué responsabilidades tiene un científico en tiempos de violencia política.', 'lightbulb'),
          ('overview', 1, 'Legado', 'Más que relatividad', 'Además de la relatividad, dejó contribuciones decisivas al estudio del efecto fotoeléctrico, el movimiento browniano y la discusión sobre los fundamentos de la mecánica cuántica.', 'sparkles'),
          ('conversation', 0, 'Idea central', 'Pensar con experimentos mentales', 'Einstein solía convertir problemas abstractos en escenas imaginables: un observador dentro de un tren, relojes sincronizados a distancia, ascensores en caída libre o haces de luz cruzando el espacio.', 'atom')
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(sort_order, year_label, phase_label, title, description, narrative_text) AS (
        VALUES
          (0, '1905', 'Descubrimientos', 'Annus mirabilis', 'Publica los trabajos que reorganizan la física moderna: efecto fotoeléctrico, movimiento browniano y relatividad especial.', 'En 1905, Einstein todavía trabajaba en la oficina de patentes de Berna. Desde fuera no parecía una figura central de la ciencia, pero ese año publicó artículos que cambiaron la manera de pensar la luz, el movimiento y el tiempo.'),
          (1, '1915', 'Nueva gravedad', 'Relatividad general', 'Formula una nueva manera de pensar la gravedad: ya no como fuerza clásica, sino como curvatura del espacio-tiempo.', 'La relatividad general cambió la imagen clásica del universo: la gravedad dejó de ser una fuerza entre masas para convertirse en geometría del espacio-tiempo. Fue una de las formulaciones más audaces de la física moderna.'),
          (2, '1921', 'Reconocimiento', 'Nobel y celebridad pública', 'Su figura se vuelve planetaria. A partir de aquí ya no es solo científico: también es símbolo cultural y político.', 'El Nobel y la fama internacional convirtieron a Einstein en algo más que un científico. Su imagen empezó a circular como símbolo del genio moderno y lo llevó a ocupar un lugar central en la cultura pública del siglo XX.'),
          (3, '1933', 'Exilio', 'Exilio y Princeton', 'Huida del nazismo, ruptura con Europa y nueva etapa en Estados Unidos. El contexto histórico entra en la conversación.', 'El exilio transformó su vida intelectual y personal. La salida de Alemania no fue solo un desplazamiento geográfico: marcó una ruptura con Europa y una conciencia cada vez más intensa del vínculo entre ciencia e historia.'),
          (4, '1945+', 'Responsabilidad', 'Conciencia moral de la ciencia', 'Tras la bomba atómica, su papel público gira hacia la advertencia ética, el pacifismo y la responsabilidad global.', 'Después de la Segunda Guerra Mundial, Einstein habló cada vez más sobre desarme, paz y responsabilidad. Su legado ya no se limitaba a las ecuaciones: también incluía una reflexión pública sobre el destino moral de la técnica.')
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(sort_order, name, role, dynamic) AS (
        VALUES
          (0, 'Niels Bohr', 'Rival intelectual fecundo', 'Ideal para conversaciones sobre incertidumbre, realidad y los límites de la física.'),
          (1, 'Mileva Maric', 'Vínculo personal y zona sensible', 'Aporta una capa humana, doméstica y menos heroica a la conversación.'),
          (2, 'Europa del entreguerras', 'Entorno histórico hostil', 'Permite abrir el chat a exilio, antisemitismo, paz y responsabilidad política.')
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      mapping(timeline_sort_order, relationship_sort_order) AS (
        VALUES
          (0, 0),
          (1, 0),
          (2, 0),
          (2, 1),
          (3, 1),
          (3, 2),
          (4, 2)
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(sort_order, label, prompt, note, cta_label) AS (
        VALUES
          (0, '1905', 'Explícame por qué 1905 cambió la física para siempre.', 'Abre la puerta al efecto fotoeléctrico, al movimiento browniano y a la relatividad especial.', 'Inicio'),
          (1, 'Bohr y la cuántica', '¿Por qué no te convencía la interpretación cuántica de Bohr?', 'Permite entrar en su idea de causalidad, realidad física y el famoso “Dios no juega a los dados”.', 'Inicio'),
          (2, 'Exilio y política', '¿Cómo te transformó vivir el exilio y ver el ascenso del nazismo?', 'Conecta biografía, antisemitismo, pacifismo y el lugar del científico en la historia.', 'Inicio')
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(sort_order, is_cover, image_url, alt, caption, credit, source_url) AS (
        VALUES
          (0, true, 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg', 'Retrato de Albert Einstein en blanco y negro', 'Retrato tardío de Einstein, ya convertido en una figura pública mundial y referente moral de la ciencia del siglo XX.', 'Fotografía de Oren J. Turner, Princeton, 1947. Wikimedia Commons.', NULL),
          (1, false, 'https://upload.wikimedia.org/wikipedia/commons/7/74/Einstein_1921_by_F_Schmutzer_-_restoration.jpg', 'Albert Einstein fotografiado en 1921', 'Einstein en los años de consolidación internacional de su fama, poco después del impacto global de la relatividad general.', 'Ferdinand Schmutzer, 1921. Wikimedia Commons.', NULL),
          (2, false, 'https://upload.wikimedia.org/wikipedia/commons/1/14/Einstein_1933.jpg', 'Albert Einstein durante la década de 1930', 'Imagen de la etapa marcada por el exilio y la salida definitiva de Europa ante el ascenso del nazismo.', 'Fotografía de 1933. Wikimedia Commons.', NULL)
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

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id
        FROM public.app_character
        WHERE name = 'Albert Einstein'
      ),
      seed_data(block_key, title, body, page_key, sort_order) AS (
        VALUES
          ('overview_intro', 'Antes de hablar con Einstein', 'Nacido en Ulm en 1879, Einstein desarrolló una forma de pensar apoyada en experimentos mentales: imaginarse viajando junto a un rayo de luz, observar relojes en movimiento o preguntarse cómo se curva el espacio cerca de una estrella. Esa mezcla de intuición, matemáticas y curiosidad marcó toda su obra.', 'overview', 0),
          ('voice_description', 'Su voz intelectual', 'Cuando explica una idea, Einstein suele partir de una imagen concreta antes de llegar a la abstracción: un tren en movimiento, una luz que viaja, un observador que cae. Su tono combina paciencia didáctica, precisión conceptual y una ironía suave cuando discute límites o paradojas.', 'conversation', 0)
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

    await queryRunner.query(`
      WITH seed_data(copy_key, text, page_key, sort_order) AS (
        VALUES
          ('page_title', 'Albert Einstein', 'layout', 0),
          ('page_subtitle', 'Fisico nacido en 1879, figura central de la relatividad y una de las voces intelectuales más influyentes del siglo XX.', 'layout', 1),
          ('overview_section_title', 'Contexto biografico e intelectual', 'overview', 0),
          ('timeline_section_title', 'Hitos e ideas fundamentales', 'timeline', 0),
          ('relations_section_title', 'Relaciones, controversias y preguntas', 'relations', 0),
          ('gallery_section_title', 'Galeria visual', 'gallery', 0),
          ('image_prompt_title', 'Conversa a partir de una imagen', 'gallery', 1),
          ('image_prompt_body', 'Usa el retrato o el contexto histórico de esta foto para abrir una conversación más situada y concreta.', 'gallery', 2),
          ('start_conversation_label', 'Iniciar conversación', 'gallery', 3)
      )
      INSERT INTO public.app_content_variant_copy (content_variant, copy_key, text, page_key, sort_order)
      SELECT 'editorial_v1', seed_data.copy_key, seed_data.text, seed_data.page_key, seed_data.sort_order
      FROM seed_data
      ON CONFLICT (content_variant, copy_key) DO UPDATE SET
        text = EXCLUDED.text,
        page_key = EXCLUDED.page_key,
        sort_order = EXCLUDED.sort_order
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM public.app_content_variant_copy
      WHERE content_variant = 'editorial_v1'
        AND copy_key IN (
          'page_title',
          'page_subtitle',
          'overview_section_title',
          'timeline_section_title',
          'relations_section_title',
          'gallery_section_title',
          'image_prompt_title',
          'image_prompt_body',
          'start_conversation_label'
        )
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_editorial_block editorial_block
      USING public.app_character character
      WHERE editorial_block.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND editorial_block.block_key IN ('overview_intro', 'voice_description')
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_gallery_image gallery_image
      USING public.app_character character
      WHERE gallery_image.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND gallery_image.sort_order IN (0, 1, 2)
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_prompt prompt
      USING public.app_character character
      WHERE prompt.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND prompt.sort_order IN (0, 1, 2)
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_relationship timeline_relationship
      USING public.app_character_timeline_entry timeline_entry, public.app_character character
      WHERE timeline_relationship.timeline_entry_id = timeline_entry.id
        AND timeline_entry.character_id = character.id
        AND character.name = 'Albert Einstein'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_relationship relationship
      USING public.app_character character
      WHERE relationship.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND relationship.sort_order IN (0, 1, 2)
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_entry timeline_entry
      USING public.app_character character
      WHERE timeline_entry.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND timeline_entry.sort_order IN (0, 1, 2, 3, 4)
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_context_card context_card
      USING public.app_character character
      WHERE context_card.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND (
          (context_card.page_key = 'overview' AND context_card.sort_order IN (0, 1))
          OR (context_card.page_key = 'conversation' AND context_card.sort_order = 0)
        )
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_fact fact
      USING public.app_character character
      WHERE fact.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND fact.section_key = 'quick_facts'
        AND fact.sort_order IN (0, 1, 2, 3)
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_quote quote
      USING public.app_character character
      WHERE quote.character_id = character.id
        AND character.name = 'Albert Einstein'
        AND quote.sort_order IN (0, 1, 2, 3)
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        description = CASE
          WHEN description = 'Albert Einstein fue uno de los grandes arquitectos de la física moderna. Su trabajo sobre la relatividad, la luz y la estructura del universo transformó la ciencia del siglo XX y lo convirtió también en una voz pública sobre guerra, paz y responsabilidad moral.'
            THEN 'Conversa sobre relatividad, ciencia y etica con un tono reflexivo y claro.'
          ELSE description
        END,
        quote = CASE
          WHEN quote = 'La imaginación es más importante que el conocimiento. El conocimiento es limitado; la imaginación rodea el mundo.'
            THEN 'La imaginacion es mas importante que el conocimiento.'
          ELSE quote
        END,
        key_traits = CASE
          WHEN key_traits = '["Claro", "Curioso", "Reflexivo", "Irónico por momentos", "Didáctico sin simplismo"]'::jsonb
            THEN '[]'::jsonb
          ELSE key_traits
        END
      WHERE name = 'Albert Einstein'
    `);
  }
}