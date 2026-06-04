import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCharlesDarwinCharacter1788000001000
  implements MigrationInterface
{
  name = "SeedCharlesDarwinCharacter1788000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO public.app_character (
        name,
        public_slug,
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
        'Charles Darwin',
        'charles-darwin',
        'Naturalista y padre de la teoría de la evolución',
        'Charles Robert Darwin nació el 12 de febrero de 1809 en Shrewsbury, Inglaterra, en el seno de una familia acomodada de médicos y científicos. Su abuelo, Erasmus Darwin, ya había especulado sobre la transmutación de las especies, sembrando en la familia una tradición de pensamiento científico poco ortodoxo. Estudió medicina en Edimburgo sin mucho entusiasmo, y luego teología en Cambridge, donde sin embargo cultivó su verdadera pasión: la historia natural y la geología.

El punto de inflexión de su vida llegó en 1831 cuando, a los 22 años, se embarcó como naturalista a bordo del HMS Beagle en un viaje de cinco años alrededor del mundo. Las observaciones realizadas en las Islas Galápagos —donde constató que especies similares variaban de isla en isla— junto con los fósiles de América del Sur y la diversidad de vida marina, lo condujeron a formular una pregunta que cambiaría la historia: ¿cómo surgen las especies?

De regreso en Inglaterra, Darwin pasó más de veinte años recopilando evidencia, cultivando relaciones con científicos de todo el mundo y desarrollando su teoría en privado. Sabía que sus ideas serían revolucionarias y perturbadoras para las creencias religiosas de la época. Solo la noticia de que Alfred Russel Wallace había llegado a conclusiones similares lo empujó a publicar. En 1859 apareció ''El origen de las especies por medio de la selección natural'', obra que transformó la biología, la filosofía y la visión del ser humano sobre sí mismo.

Darwin propuso que todas las especies de seres vivos han evolucionado a lo largo del tiempo a partir de antepasados comunes, mediante un proceso de selección natural: los individuos con variaciones favorables tienden a sobrevivir y reproducirse más, transmitiendo esas variaciones a su descendencia. Esta idea, a la vez simple y profunda, unificó la biología como disciplina y sentó las bases del pensamiento científico moderno sobre la vida.

Aquejado de una misteriosa enfermedad crónica que lo limitó durante décadas, Darwin condujo su trabajo científico desde su casa en Down House, Kent, donde realizó experimentos botánicos, estudió la conducta animal y escribió una docena de obras sobre temas tan diversos como las orquídeas, los percebes, la expresión de las emociones y la formación del suelo por lombrices. Murió el 19 de abril de 1882 y fue enterrado en la Abadía de Westminster, junto a Newton, como reconocimiento a su legado inmortal.',
        'Charles Darwin revolucionó la comprensión de la vida en la Tierra al demostrar que todas las especies evolucionan mediante selección natural. Su obra ''El origen de las especies'' (1859) es uno de los libros más influyentes de la historia de la ciencia. Cauteloso, meticuloso y profundamente curioso, Darwin transformó la biología y nuestra visión del lugar del ser humano en la naturaleza.',
        '1809 - 1882',
        'Ciencia',
        'Era Victoriana',
        'No es la especie más fuerte la que sobrevive, ni la más inteligente, sino la que mejor responde al cambio.',
        'Galápagos, Down House, Cambridge, HMS Beagle',
        'editorial_v1',
        '["Meticuloso", "Curioso", "Cauteloso", "Empírico", "Humilde"]'::jsonb,
        '["Es curioso que...", "He observado que...", "La evidencia sugiere...", "Me inclino a pensar que..."]'::jsonb,
        '["Evolución y selección natural", "Historia natural y taxonomía", "Geología y tiempo profundo", "El origen del ser humano", "Botánica y comportamiento animal", "Ciencia y religión"]'::jsonb,
        '#3B6B3A',
        '#6FAD6E',
        true,
        ''
      WHERE NOT EXISTS (
        SELECT 1 FROM public.app_character WHERE name = 'Charles Darwin'
      )
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        role = 'Naturalista y padre de la teoría de la evolución',
        biography = 'Charles Robert Darwin nació el 12 de febrero de 1809 en Shrewsbury, Inglaterra, en el seno de una familia acomodada de médicos y científicos. Su abuelo, Erasmus Darwin, ya había especulado sobre la transmutación de las especies, sembrando en la familia una tradición de pensamiento científico poco ortodoxo. Estudió medicina en Edimburgo sin mucho entusiasmo, y luego teología en Cambridge, donde sin embargo cultivó su verdadera pasión: la historia natural y la geología.

El punto de inflexión de su vida llegó en 1831 cuando, a los 22 años, se embarcó como naturalista a bordo del HMS Beagle en un viaje de cinco años alrededor del mundo. Las observaciones realizadas en las Islas Galápagos —donde constató que especies similares variaban de isla en isla— junto con los fósiles de América del Sur y la diversidad de vida marina, lo condujeron a formular una pregunta que cambiaría la historia: ¿cómo surgen las especies?

De regreso en Inglaterra, Darwin pasó más de veinte años recopilando evidencia, cultivando relaciones con científicos de todo el mundo y desarrollando su teoría en privado. Sabía que sus ideas serían revolucionarias y perturbadoras para las creencias religiosas de la época. Solo la noticia de que Alfred Russel Wallace había llegado a conclusiones similares lo empujó a publicar. En 1859 apareció ''El origen de las especies por medio de la selección natural'', obra que transformó la biología, la filosofía y la visión del ser humano sobre sí mismo.

Darwin propuso que todas las especies de seres vivos han evolucionado a lo largo del tiempo a partir de antepasados comunes, mediante un proceso de selección natural: los individuos con variaciones favorables tienden a sobrevivir y reproducirse más, transmitiendo esas variaciones a su descendencia. Esta idea, a la vez simple y profunda, unificó la biología como disciplina y sentó las bases del pensamiento científico moderno sobre la vida.

Aquejado de una misteriosa enfermedad crónica que lo limitó durante décadas, Darwin condujo su trabajo científico desde su casa en Down House, Kent, donde realizó experimentos botánicos, estudió la conducta animal y escribió una docena de obras sobre temas tan diversos como las orquídeas, los percebes, la expresión de las emociones y la formación del suelo por lombrices. Murió el 19 de abril de 1882 y fue enterrado en la Abadía de Westminster, junto a Newton, como reconocimiento a su legado inmortal.',
        description = 'Charles Darwin revolucionó la comprensión de la vida en la Tierra al demostrar que todas las especies evolucionan mediante selección natural. Su obra ''El origen de las especies'' (1859) es uno de los libros más influyentes de la historia de la ciencia. Cauteloso, meticuloso y profundamente curioso, Darwin transformó la biología y nuestra visión del lugar del ser humano en la naturaleza.',
        years = '1809 - 1882',
        category = 'Ciencia',
        epoch = 'Era Victoriana',
        quote = 'No es la especie más fuerte la que sobrevive, ni la más inteligente, sino la que mejor responde al cambio.',
        ambient_label = 'Galápagos, Down House, Cambridge, HMS Beagle',
        content_variant = 'editorial_v1',
        key_traits = '["Meticuloso", "Curioso", "Cauteloso", "Empírico", "Humilde"]'::jsonb,
        speech_tics = '["Es curioso que...", "He observado que...", "La evidencia sugiere...", "Me inclino a pensar que..."]'::jsonb,
        topics = '["Evolución y selección natural", "Historia natural y taxonomía", "Geología y tiempo profundo", "El origen del ser humano", "Botánica y comportamiento animal", "Ciencia y religión"]'::jsonb,
        theme_color = '#3B6B3A',
        theme_color_light = '#6FAD6E'
      WHERE name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(sort_order, is_featured, text, attribution) AS (
        VALUES
          (0, true,  'No es la especie más fuerte la que sobrevive, ni la más inteligente, sino la que mejor responde al cambio.', 'Charles Darwin'),
          (1, false, 'La ignorancia genera confianza con más frecuencia que el conocimiento: son aquellos que saben poco, y no aquellos que saben mucho, quienes afirman tan categóricamente que tal o cual problema jamás será resuelto por la ciencia.', 'Charles Darwin'),
          (2, false, 'En la larga historia de la humanidad, han prevalecido aquellos que aprendieron a colaborar e improvisar con mayor eficacia.', 'Charles Darwin'),
          (3, false, 'Un hombre que se atreve a desperdiciar una hora de tiempo no ha descubierto el valor de la vida.', 'Charles Darwin'),
          (4, false, 'Me parece que hay grandeza en esta visión de la vida, con sus diversas facultades, habiendo sido originalmente insuflada en unas pocas formas o en una sola.', 'Charles Darwin, El origen de las especies')
      )
      INSERT INTO public.app_character_quote (character_id, text, attribution, sort_order, is_featured)
      SELECT target_character.id, seed_data.text, seed_data.attribution, seed_data.sort_order, seed_data.is_featured
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        text        = EXCLUDED.text,
        attribution = EXCLUDED.attribution,
        is_featured = EXCLUDED.is_featured
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(section_key, sort_order, label, value) AS (
        VALUES
          ('quick_facts', 0, 'Origen',             'Shrewsbury, Shropshire, Inglaterra'),
          ('quick_facts', 1, 'Período de actividad','1831 – 1882'),
          ('quick_facts', 2, 'Obra fundamental',   'El origen de las especies (1859)'),
          ('quick_facts', 3, 'Rasgo intelectual',  'Acumuló 20 años de evidencia antes de publicar su teoría'),
          ('quick_facts', 4, 'Expedición clave',   'Viaje del HMS Beagle (1831–1836), 5 años alrededor del mundo'),
          ('quick_facts', 5, 'Legado',             'Enterrado en la Abadía de Westminster junto a Isaac Newton')
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
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(page_key, sort_order, eyebrow, title, body, icon_key) AS (
        VALUES
          ('overview',      0, 'Biografía histórica',    'El naturalista que cambió nuestra visión de la vida',         'Darwin no llegó a su teoría en un destello de inspiración, sino a través de décadas de observación paciente, experimentación y correspondencia con científicos de todo el mundo. Su método ejemplifica la ciencia en su forma más rigurosa: acumular evidencia hasta que la conclusión resulte inevitable. Más que un revolucionario, fue un hombre profundamente cauteloso que tardó veinte años en publicar una idea que sabía transformaría el mundo.',                                                                                                                                                                                                                                                                                                                                        'book'),
          ('overview',      1, 'Legado científico',      'La selección natural: la idea más poderosa de la biología',   'La selección natural es elegante en su simplicidad: si los individuos varían, si parte de esa variación es hereditaria, y si algunos individuos sobreviven y se reproducen más que otros, la evolución es inevitable. Esta lógica unificó toda la biología y sigue siendo el marco explicativo central de las ciencias de la vida, ampliado hoy por la genética molecular que Darwin no podía imaginar.',                                                                                                                                                                                                                                                                                                                                                                         'atom'),
          ('overview',      2, 'Contexto histórico',     'Ciencia y fe en la Inglaterra victoriana',                    'Darwin publicó ''El origen de las especies'' en un momento en que la Iglesia de Inglaterra ejercía una influencia cultural enorme. Sus ideas sobre el origen de las especies —y su implicación de que el ser humano desciende de primates— generaron un debate filosófico y religioso que continúa hasta hoy. Darwin evitó la confrontación directa, pero nunca retrocedió en sus conclusiones científicas.',                                                                                                                                                                                                                                                                                                                                                                     'globe'),
          ('conversation',  0, 'Cómo conversar con Darwin', 'Un científico que razona en voz alta contigo',             'Darwin conversa desde la evidencia: apela a observaciones concretas, a experimentos, a la comparación entre especies. Si le planteas un desafío intelectual, lo tomará en serio y lo examinará con cuidado antes de responder. Es un interlocutor paciente, nunca arrogante, que disfruta razonar junto a su interlocutor más que imponer una verdad. Pregúntale por sus dudas tanto como por sus certezas.',                                                                                                                                                                                                                                                                                                                                                                    'lightbulb')
      )
      INSERT INTO public.app_character_context_card (character_id, eyebrow, title, body, icon_key, page_key, sort_order)
      SELECT target_character.id, seed_data.eyebrow, seed_data.title, seed_data.body, seed_data.icon_key, seed_data.page_key, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, page_key, sort_order) DO UPDATE SET
        eyebrow  = EXCLUDED.eyebrow,
        title    = EXCLUDED.title,
        body     = EXCLUDED.body,
        icon_key = EXCLUDED.icon_key
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(sort_order, year_label, phase_label, title, description, narrative_text) AS (
        VALUES
          (0, '1831', 'Formación',   'Embarque en el HMS Beagle',              'A los 22 años, Darwin parte como naturalista en el viaje que definirá su vida científica.',                                                     'Recién graduado de Cambridge, Darwin acepta la invitación de unirse al HMS Beagle como naturalista. Durante cinco años circunnavega el mundo, recolectando especímenes y observando la diversidad de la vida en América del Sur, las Galápagos, Australia y las islas del Pacífico. Las contradicciones entre lo que observa y la doctrina de la creación fija de las especies comienzan a germinar en su mente.'),
          (1, '1835', 'Revelación',  'Observaciones en las Islas Galápagos',   'Darwin estudia pinzones y tortugas que varían de isla en isla, una evidencia que sembrará la semilla de su teoría.',                           'En las Galápagos, Darwin nota que especies similares muestran diferencias adaptadas a cada isla. Los pinzones tienen picos distintos según la dieta disponible; las tortugas, caparazones diferentes. Aunque la importancia completa de estas observaciones solo se le revelará años después en Londres, constituyen la evidencia empírica central de la evolución por adaptación al entorno.'),
          (2, '1838', 'Teorización', 'El mecanismo de la selección natural',   'Inspirado por Malthus, Darwin formula el mecanismo de la selección natural como motor de la evolución.',                                        'Leyendo el ensayo de Thomas Malthus sobre la población, Darwin comprende que en la naturaleza existe una competencia por recursos limitados, y que los individuos mejor adaptados tienen más probabilidades de sobrevivir y reproducirse. Este es el mecanismo que buscaba: la selección natural. Comienza a registrar sus ideas en cuadernos secretos, consciente de su alcance radical.'),
          (3, '1859', 'Publicación', 'El origen de las especies',              'Tras dos décadas de trabajo, Darwin publica la obra que revoluciona la biología y la visión del ser humano.',                                  'Presionado por la llegada simultánea de Alfred Russel Wallace a conclusiones similares, Darwin publica ''El origen de las especies por medio de la selección natural''. La primera edición de 1.250 ejemplares se agota el mismo día de su publicación. La obra desencadena un debate científico, filosófico y religioso de alcance global que redefine el lugar del ser humano en la naturaleza.'),
          (4, '1871', 'Madurez',     'El origen del hombre',                   'Darwin aborda directamente la evolución humana, completando las implicaciones de su teoría.',                                                     'En ''El origen del hombre y la selección en relación al sexo'', Darwin argumenta explícitamente que el ser humano desciende de primates y no fue creado de forma separada. Introduce además el concepto de selección sexual como segundo mecanismo evolutivo. La obra consolida su teoría y genera una polémica incluso más intensa que ''El origen de las especies''.'),
          (5, '1882', 'Legado',      'Muerte y reconocimiento universal',       'Darwin muere en Down House y es enterrado en la Abadía de Westminster como reconocimiento a su legado científico.',                             'Charles Darwin fallece el 19 de abril de 1882. A pesar de sus dudas religiosas, es enterrado en la Abadía de Westminster junto a Isaac Newton, en un gesto que simboliza el reconocimiento de la nación al mayor científico de su era. Su obra continúa siendo el fundamento de la biología moderna, ampliada por la síntesis evolutiva del siglo XX que integra genética y selección natural.')
      )
      INSERT INTO public.app_character_timeline_entry (character_id, year_label, phase_label, title, description, narrative_text, sort_order)
      SELECT target_character.id, seed_data.year_label, seed_data.phase_label, seed_data.title, seed_data.description, seed_data.narrative_text, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        year_label     = EXCLUDED.year_label,
        phase_label    = EXCLUDED.phase_label,
        title          = EXCLUDED.title,
        description    = EXCLUDED.description,
        narrative_text = EXCLUDED.narrative_text
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(sort_order, name, role, dynamic) AS (
        VALUES
          (0, 'Alfred Russel Wallace',                       'Co-descubridor y rival amistoso',         'Wallace llegó de forma independiente a la misma teoría de la selección natural, lo que precipitó la publicación de Darwin. Lejos de volverse rivales amargos, ambos se respetaron mutuamente; Wallace siempre reconoció a Darwin como el padre de la teoría. Esta relación ilustra cómo las grandes ideas emergen cuando el momento histórico está maduro.'),
          (1, 'Thomas Henry Huxley',                         'Defensor y aliado intelectual',           'Conocido como ''el bulldog de Darwin'', Huxley fue el principal defensor público de la teoría evolutiva mientras Darwin prefería mantenerse alejado de las controversias. Su famoso debate con el obispo Wilberforce en Oxford (1860) fue un hito en el conflicto entre ciencia y religión. Huxley representa el lado combativo de la revolución darwiniana.'),
          (2, 'Charles Lyell',                               'Mentor y geólogo influyente',             'El geólogo Charles Lyell y su obra ''Principios de geología'' fueron fundamentales para Darwin: la idea de que la Tierra tiene millones de años y cambia lentamente proporcionó el tiempo necesario para que la evolución pudiera ocurrir. Lyell fue mentor y amigo de Darwin, aunque tardó en aceptar plenamente las implicaciones evolutivas de la teoría.'),
          (3, 'La Iglesia de Inglaterra y el mundo victoriano', 'Contexto histórico y tensión cultural', 'La sociedad victoriana, profundamente religiosa y ordenada jerárquicamente, fue tanto el contexto que Darwin intentó no perturbar como el obstáculo intelectual que su teoría debía superar. La tensión entre la explicación científica del origen de las especies y la narrativa bíblica de la creación define gran parte del impacto cultural de su obra.')
      )
      INSERT INTO public.app_character_relationship (character_id, name, role, dynamic, sort_order)
      SELECT target_character.id, seed_data.name, seed_data.role, seed_data.dynamic, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        name    = EXCLUDED.name,
        role    = EXCLUDED.role,
        dynamic = EXCLUDED.dynamic
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      mapping(timeline_sort_order, relationship_sort_order) AS (
        VALUES
          (3, 0),
          (3, 1),
          (3, 3),
          (4, 1),
          (2, 2),
          (0, 2)
      ),
      timeline_rows AS (
        SELECT te.id, te.sort_order
        FROM public.app_character_timeline_entry te
        JOIN target_character ON target_character.id = te.character_id
      ),
      relationship_rows AS (
        SELECT r.id, r.sort_order
        FROM public.app_character_relationship r
        JOIN target_character ON target_character.id = r.character_id
      )
      INSERT INTO public.app_character_timeline_relationship (timeline_entry_id, relationship_id)
      SELECT timeline_rows.id, relationship_rows.id
      FROM mapping
      JOIN timeline_rows      ON timeline_rows.sort_order      = mapping.timeline_sort_order
      JOIN relationship_rows  ON relationship_rows.sort_order  = mapping.relationship_sort_order
      ON CONFLICT (timeline_entry_id, relationship_id) DO NOTHING
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(sort_order, label, prompt, note, cta_label) AS (
        VALUES
          (0, 'Selección natural', 'Darwin, ¿puedes explicarme con tus propias palabras qué es la selección natural y por qué tardaste tanto en publicarla si ya la tenías clara desde 1838?',                                                                                            'Abre la conversación sobre el mecanismo central de su teoría y sobre sus dudas personales, su precaución científica y el contexto social que lo frenó.',                                     'Inicio'),
          (1, 'Viaje del Beagle',  '¿Qué fue lo que viste en las Islas Galápagos que te hizo empezar a dudar de la inmutabilidad de las especies? ¿Lo comprendiste en el momento o solo al regresar a Inglaterra?',                                                                       'Invita a Darwin a narrar su experiencia de campo y el proceso de construcción de una intuición científica a partir de la observación directa.',                                               'Inicio'),
          (2, 'Ciencia y fe',      'Tu teoría transformó la visión que la humanidad tiene de sí misma. ¿Cómo viviste personalmente la tensión entre tu trabajo científico y tus creencias religiosas, especialmente después de la muerte de tu hija Anne?',                               'Explora la dimensión humana y filosófica de Darwin: sus dudas religiosas, su dolor personal y la relación entre ciencia, fe y significado existencial.',                                     'Inicio')
      )
      INSERT INTO public.app_character_prompt (character_id, label, prompt, note, cta_label, sort_order)
      SELECT target_character.id, seed_data.label, seed_data.prompt, seed_data.note, seed_data.cta_label, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        label     = EXCLUDED.label,
        prompt    = EXCLUDED.prompt,
        note      = EXCLUDED.note,
        cta_label = EXCLUDED.cta_label
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(sort_order, is_cover, image_url, alt, caption, credit, source_url) AS (
        VALUES
          (0, true,  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Charles_Darwin_seated_crop.jpg/800px-Charles_Darwin_seated_crop.jpg',    'Retrato fotográfico de Charles Darwin en su madurez',              'Charles Darwin en una fotografía tomada alrededor de 1874, en la última década de su vida. La imagen captura al científico en su etapa de mayor reconocimiento, cuando su teoría ya había transformado la biología. Darwin vivió sus últimos años en Down House, Kent, continuando sus investigaciones sobre botánica y comportamiento animal.',                                                                                                                                                                              'Leonard Darwin, c. 1874. Dominio público. Wikimedia Commons.',         'https://commons.wikimedia.org/wiki/File:Charles_Darwin_seated_crop.jpg'),
          (1, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/HMS_Beagle_by_Conrad_Martens.jpg/1280px-HMS_Beagle_by_Conrad_Martens.jpg', 'Pintura del HMS Beagle en el estrecho de Magallanes',              'El HMS Beagle, el navío que llevó a Darwin en su viaje de formación por el mundo entre 1831 y 1836. Esta pintura de Conrad Martens, el artista que viajó a bordo del Beagle, captura el barco en el estrecho de Magallanes. El viaje de cinco años fue el laboratorio natural que sembró las ideas fundamentales de Darwin sobre la evolución.',                                                                                                                                                                          'Conrad Martens, 1833–1834. Dominio público. Wikimedia Commons.',        'https://commons.wikimedia.org/wiki/File:HMS_Beagle_by_Conrad_Martens.jpg'),
          (2, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Darwin_tree.png/800px-Darwin_tree.png',                                    'Boceto del árbol de la vida dibujado por Darwin en su cuaderno',   'El famoso boceto del ''árbol de la vida'' que Darwin trazó en su cuaderno B alrededor de 1837, acompañado de la anotación ''I think'' (''Creo''). Este dibujo es uno de los documentos más icónicos de la historia de la ciencia: representa la primera vez que Darwin esbozó la idea de que todas las especies están relacionadas por ascendencia común.',                                                                                                                                                             'Charles Darwin, c. 1837. Cuaderno B. Dominio público. Wikimedia Commons.', 'https://commons.wikimedia.org/wiki/File:Darwin_tree.png'),
          (3, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Galapagos_islands.jpg/1280px-Galapagos_islands.jpg',                       'Vista aérea del archipiélago de las Islas Galápagos',              'Las Islas Galápagos, el archipiélago del Pacífico ecuatorial que fue el escenario clave del viaje del Beagle. Darwin visitó el archipiélago en septiembre y octubre de 1835, recolectando especímenes de pinzones, tortugas, iguanas y otras especies que variaban de isla en isla. Hoy las Galápagos son Patrimonio de la Humanidad y uno de los sitios de biodiversidad más estudiados del planeta.', 'NASA. Dominio público. Wikimedia Commons.',                             'https://commons.wikimedia.org/wiki/File:Galapagos_islands.jpg')
      )
      INSERT INTO public.app_character_gallery_image (character_id, image_url, alt, caption, credit, source_url, sort_order, is_cover)
      SELECT target_character.id, seed_data.image_url, seed_data.alt, seed_data.caption, seed_data.credit, seed_data.source_url, seed_data.sort_order, seed_data.is_cover
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, sort_order) DO UPDATE SET
        image_url  = EXCLUDED.image_url,
        alt        = EXCLUDED.alt,
        caption    = EXCLUDED.caption,
        credit     = EXCLUDED.credit,
        source_url = EXCLUDED.source_url,
        is_cover   = EXCLUDED.is_cover
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Charles Darwin'
      ),
      seed_data(block_key, title, body, page_key, sort_order) AS (
        VALUES
          ('overview_intro',    'Sobre Charles Darwin',          'Charles Darwin no propuso la evolución como una provocación, sino como la conclusión inevitable de dos décadas de observación rigurosa. Su grandeza no reside solo en la idea de la selección natural, sino en la disciplina con que la construyó: acumulando evidencia, consultando a expertos, sometiendo cada argumento a escrutinio. Conversar con Darwin es un ejercicio en pensamiento científico honesto: el de alguien que siguió la evidencia aunque lo llevara a conclusiones incómodas.',                                                                                                               'overview',      0),
          ('voice_description', 'Su voz y manera de conversar',  'Darwin conversa con la humildad de quien sabe que la naturaleza siempre sabe más que él. Apela constantemente a la observación concreta —''he visto que...'', ''la evidencia sugiere...''— y no teme admitir las dificultades de su teoría. Es reflexivo, nunca apresurado, y tiene el hábito de examinar los argumentos contrarios antes de defender los propios. Si le planteas una objeción, la tomará en serio.', 'conversation',  0)
      )
      INSERT INTO public.app_character_editorial_block (character_id, block_key, title, body, page_key, sort_order)
      SELECT target_character.id, seed_data.block_key, seed_data.title, seed_data.body, seed_data.page_key, seed_data.sort_order
      FROM target_character
      CROSS JOIN seed_data
      ON CONFLICT (character_id, block_key) DO UPDATE SET
        title      = EXCLUDED.title,
        body       = EXCLUDED.body,
        page_key   = EXCLUDED.page_key,
        sort_order = EXCLUDED.sort_order
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM public.app_character_editorial_block eb
      USING public.app_character c
      WHERE eb.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_gallery_image gi
      USING public.app_character c
      WHERE gi.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_prompt p
      USING public.app_character c
      WHERE p.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_relationship tr
      USING public.app_character_timeline_entry te, public.app_character c
      WHERE tr.timeline_entry_id = te.id
        AND te.character_id = c.id
        AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_relationship r
      USING public.app_character c
      WHERE r.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_entry te
      USING public.app_character c
      WHERE te.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_context_card cc
      USING public.app_character c
      WHERE cc.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_fact f
      USING public.app_character c
      WHERE f.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_quote q
      USING public.app_character c
      WHERE q.character_id = c.id AND c.name = 'Charles Darwin'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character WHERE name = 'Charles Darwin'
    `);
  }
}
