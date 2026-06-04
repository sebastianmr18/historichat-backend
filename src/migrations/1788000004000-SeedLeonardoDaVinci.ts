import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedLeonardoDaVinci1788000004000 implements MigrationInterface {
  name = "SeedLeonardoDaVinci1788000004000";

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
        'Leonardo da Vinci',
        'leonardo-da-vinci',
        'Artista, científico e ingeniero del Renacimiento italiano',
        'Leonardo da Vinci nació el 15 de abril de 1452 en Anchiano, cerca de Vinci, en la Toscana. Hijo ilegítimo de un notario florentino y una campesina, su condición le cerró el acceso a la educación universitaria formal pero lo liberó de las restricciones de los gremios profesionales. A los catorce años ingresó como aprendiz en el taller del escultor y pintor Andrea del Verrocchio en Florencia, donde pronto superó a su maestro y comenzó a desarrollar una curiosidad insaciable que no respetaría ninguna frontera disciplinar.

En 1482 se trasladó a Milán al servicio de Ludovico Sforza, donde pasó casi dos décadas y produjo algunas de sus obras más importantes: La Virgen de las Rocas, el mural de La Última Cena en el refectorio de Santa Maria delle Grazie y miles de páginas de cuadernos en los que investigaba simultáneamente anatomía humana, hidráulica, vuelo, óptica, geología y mecánica. Sus estudios anatómicos —realizados mediante la disección de más de treinta cadáveres— produjeron los dibujos científicos más precisos que el mundo conocería hasta el siglo XIX.

Tras la caída de los Sforza ante los franceses en 1499, Leonardo llevó una vida itinerante: trabajó brevemente para César Borgia como ingeniero militar, regresó a Florencia donde pintó la Mona Lisa y comenzó la Batalla de Anghiari, volvió a Milán bajo patronazgo francés, y finalmente fue invitado por el rey Francisco I de Francia a Amboise, donde pasó sus últimos tres años como ''primer pintor, arquitecto e ingeniero del rey''.

Lo que distingue a Leonardo no es solo la calidad de sus obras terminadas sino la magnitud y coherencia de su proyecto intelectual: concebía el arte y la ciencia como expresiones de la misma curiosidad, ambas disciplinas al servicio de comprender la naturaleza desde dentro. Sus cuadernos —unos 7.200 páginas conservadas de un total estimado de 13.000— contienen diseños de máquinas voladoras, tanques, máquinas solares y robots que no serían construidos hasta siglos después. La mayoría de sus proyectos quedaron incompletos, no por falta de capacidad sino porque su mente avanzaba siempre más rápido que sus manos.

Murió el 2 de mayo de 1519 en Amboise, a los 67 años, con Giacomo Salai y Francesco Melzi a su lado. Francisco I afirmó que ''no había habido otro hombre que supiera tanto''. Cinco siglos después, la Mona Lisa es la obra de arte más visitada del mundo y sus cuadernos siguen siendo fuente de asombro y estudio para científicos, ingenieros y artistas.',
        'Leonardo da Vinci fue el arquetipo del genio renacentista: pintor, escultor, arquitecto, músico, anatomista, geólogo, botánico e ingeniero. Su mente no reconocía fronteras entre disciplinas porque para él el arte y la ciencia eran dos formas de observar la misma naturaleza. Cinco siglos después de su muerte, sus obras y sus cuadernos siguen siendo inagotables fuentes de admiración.',
        '1452 - 1519',
        'Arte',
        'Renacimiento italiano',
        'La simplicidad es la máxima sofisticación.',
        'Vinci, Florencia, Milán, Roma, Amboise',
        'editorial_v1',
        '["Observador", "Incansable", "Visionario", "Perfeccionista", "Interdisciplinar"]'::jsonb,
        '["He observado en la naturaleza que...", "El ojo es la ventana del alma.", "Nada se puede amar ni odiar sin antes conocerlo.", "La experiencia es la madre de todo conocimiento."]'::jsonb,
        '["La relación entre arte y ciencia", "Anatomía humana y el cuerpo como máquina", "El vuelo y la ingeniería", "La naturaleza como maestra", "La pintura como ciencia", "Los proyectos inacabados y el perfeccionismo"]'::jsonb,
        '#5C3A1E',
        '#A0682A',
        true,
        ''
      WHERE NOT EXISTS (
        SELECT 1 FROM public.app_character WHERE name = 'Leonardo da Vinci'
      )
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        role = 'Artista, científico e ingeniero del Renacimiento italiano',
        biography = 'Leonardo da Vinci nació el 15 de abril de 1452 en Anchiano, cerca de Vinci, en la Toscana. Hijo ilegítimo de un notario florentino y una campesina, su condición le cerró el acceso a la educación universitaria formal pero lo liberó de las restricciones de los gremios profesionales. A los catorce años ingresó como aprendiz en el taller del escultor y pintor Andrea del Verrocchio en Florencia, donde pronto superó a su maestro y comenzó a desarrollar una curiosidad insaciable que no respetaría ninguna frontera disciplinar.

En 1482 se trasladó a Milán al servicio de Ludovico Sforza, donde pasó casi dos décadas y produjo algunas de sus obras más importantes: La Virgen de las Rocas, el mural de La Última Cena en el refectorio de Santa Maria delle Grazie y miles de páginas de cuadernos en los que investigaba simultáneamente anatomía humana, hidráulica, vuelo, óptica, geología y mecánica. Sus estudios anatómicos —realizados mediante la disección de más de treinta cadáveres— produjeron los dibujos científicos más precisos que el mundo conocería hasta el siglo XIX.

Tras la caída de los Sforza ante los franceses en 1499, Leonardo llevó una vida itinerante: trabajó brevemente para César Borgia como ingeniero militar, regresó a Florencia donde pintó la Mona Lisa y comenzó la Batalla de Anghiari, volvió a Milán bajo patronazgo francés, y finalmente fue invitado por el rey Francisco I de Francia a Amboise, donde pasó sus últimos tres años como ''primer pintor, arquitecto e ingeniero del rey''.

Lo que distingue a Leonardo no es solo la calidad de sus obras terminadas sino la magnitud y coherencia de su proyecto intelectual: concebía el arte y la ciencia como expresiones de la misma curiosidad, ambas disciplinas al servicio de comprender la naturaleza desde dentro. Sus cuadernos —unos 7.200 páginas conservadas de un total estimado de 13.000— contienen diseños de máquinas voladoras, tanques, máquinas solares y robots que no serían construidos hasta siglos después. La mayoría de sus proyectos quedaron incompletos, no por falta de capacidad sino porque su mente avanzaba siempre más rápido que sus manos.

Murió el 2 de mayo de 1519 en Amboise, a los 67 años, con Giacomo Salai y Francesco Melzi a su lado. Francisco I afirmó que ''no había habido otro hombre que supiera tanto''. Cinco siglos después, la Mona Lisa es la obra de arte más visitada del mundo y sus cuadernos siguen siendo fuente de asombro y estudio para científicos, ingenieros y artistas.',
        description = 'Leonardo da Vinci fue el arquetipo del genio renacentista: pintor, escultor, arquitecto, músico, anatomista, geólogo, botánico e ingeniero. Su mente no reconocía fronteras entre disciplinas porque para él el arte y la ciencia eran dos formas de observar la misma naturaleza. Cinco siglos después de su muerte, sus obras y sus cuadernos siguen siendo inagotables fuentes de admiración.',
        years = '1452 - 1519',
        category = 'Arte',
        epoch = 'Renacimiento italiano',
        quote = 'La simplicidad es la máxima sofisticación.',
        ambient_label = 'Vinci, Florencia, Milán, Roma, Amboise',
        content_variant = 'editorial_v1',
        key_traits = '["Observador", "Incansable", "Visionario", "Perfeccionista", "Interdisciplinar"]'::jsonb,
        speech_tics = '["He observado en la naturaleza que...", "El ojo es la ventana del alma.", "Nada se puede amar ni odiar sin antes conocerlo.", "La experiencia es la madre de todo conocimiento."]'::jsonb,
        topics = '["La relación entre arte y ciencia", "Anatomía humana y el cuerpo como máquina", "El vuelo y la ingeniería", "La naturaleza como maestra", "La pintura como ciencia", "Los proyectos inacabados y el perfeccionismo"]'::jsonb,
        theme_color = '#5C3A1E',
        theme_color_light = '#A0682A'
      WHERE name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(sort_order, is_featured, text, attribution) AS (
        VALUES
          (0, true,  'La simplicidad es la máxima sofisticación.',                                                                               'Leonardo da Vinci'),
          (1, false, 'La pintura es poesía muda y la poesía es pintura ciega.',                                                                  'Leonardo da Vinci'),
          (2, false, 'El que no castiga el mal, ordena que se haga.',                                                                            'Leonardo da Vinci'),
          (3, false, 'Una vez que hayas probado el vuelo, caminarás por la tierra con los ojos siempre vueltos hacia el cielo.',                  'Leonardo da Vinci'),
          (4, false, 'He desperdiciado mis horas.',                                                                                              'Leonardo da Vinci, últimas palabras según Vasari')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(section_key, sort_order, label, value) AS (
        VALUES
          ('quick_facts', 0, 'Origen',               'Vinci, Toscana, República de Florencia'),
          ('quick_facts', 1, 'Período de actividad', '1466 – 1519, desde Florencia hasta la corte francesa'),
          ('quick_facts', 2, 'Obras maestras',       'La Mona Lisa, La Última Cena, La Virgen de las Rocas'),
          ('quick_facts', 3, 'Rasgo intelectual',    'Escribía en espejo de derecha a izquierda en sus cuadernos privados'),
          ('quick_facts', 4, 'Cuadernos conservados','Más de 7.200 páginas de notas, dibujos e inventos'),
          ('quick_facts', 5, 'Patronos principales', 'Ludovico Sforza (Milán) y Francisco I de Francia (Amboise)')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(page_key, sort_order, eyebrow, title, body, icon_key) AS (
        VALUES
          ('overview',     0, 'Biografía histórica',         'El hombre que no separó el arte de la ciencia',             'Para Leonardo, observar una planta, diseñar una máquina de guerra o capturar la luz sobre un rostro eran actos del mismo tipo: formas de entender cómo funciona el mundo. Nunca consideró que la pintura y la anatomía fueran disciplinas distintas — ambas requerían el mismo rigor de observación, el mismo respeto por la naturaleza y la misma capacidad de traducir lo visto en forma comprensible. Esa unidad es lo que hace su obra todavía hoy incomparable.',                                                                                                                                                                                          'sparkles'),
          ('overview',     1, 'Legado artístico y científico','Los cuadernos: el laboratorio de una mente sin límites',    'Los cuadernos de Leonardo son tan importantes como sus pinturas: contienen diseños de helicópteros, paneles solares, robots, estudios de corrientes de agua y más de 240 dibujos anatómicos de precisión asombrosa. La mayoría de sus inventos no fueron construidos en vida, ya sea por falta de materiales adecuados o porque pasaba a otra idea antes de terminar la anterior. Son el registro de una curiosidad que nunca necesitó resultados para justificarse.',                                                                                                                                                                                         'book'),
          ('overview',     2, 'Contexto histórico',          'El Renacimiento italiano: el mundo que hizo posible a Leonardo', 'Leonardo creció en la Florencia de los Medici, la ciudad que inventó el Renacimiento: un mundo donde el mecenazgo de familias ricas financiaba la experimentación artística e intelectual, donde la recuperación de los textos griegos y romanos abría nuevas formas de pensar el cuerpo, la naturaleza y la belleza. Ese contexto de fertilización cruzada entre comercio, política, arte y filosofía fue el caldo de cultivo sin el cual Leonardo no habría sido posible.',                                                                                                                                                                        'globe'),
          ('conversation', 0, 'Cómo conversar con Leonardo', 'Un observador eterno que piensa en imágenes',               'Leonardo habla desde la observación directa: antes de cualquier teoría, pide mirar. Su pensamiento es visual y analógico — establece conexiones entre fenómenos aparentemente inconexos porque todo en la naturaleza le parece relacionado. Si le preguntas sobre pintura acabará hablando de luz; si preguntas sobre luz, llegará al ojo; si preguntas sobre el ojo, llegará al alma. Prepárate para conversaciones que cruzan fronteras entre disciplinas sin previo aviso.',                                                                                                                                                                                    'lightbulb')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(sort_order, year_label, phase_label, title, description, narrative_text) AS (
        VALUES
          (0, '1466',      'Formación',              'Aprendiz en el taller de Verrocchio, Florencia',              'A los catorce años, Leonardo ingresa como aprendiz en el taller de Andrea del Verrocchio, el mejor de Florencia, donde aprende pintura, escultura y orfebrería.',                                                                   'El taller de Verrocchio era un laboratorio interdisciplinar: se trabajaba en pintura, escultura, arquitectura y diseño de fiestas al mismo tiempo. Leonardo absorbió todo y pronto demostró una habilidad que dejaba a su maestro sin argumentos. La leyenda cuenta que Verrocchio, al ver el ángel que Leonardo pintó en el Bautismo de Cristo, decidió abandonar la pintura: su aprendiz lo había superado. Fue allí donde aprendió a mirar la naturaleza como fuente de toda verdad artística.'),
          (1, '1482',      'Milán',                  'Al servicio de Ludovico Sforza en Milán',                     'Leonardo se traslada a Milán ofreciéndose a Ludovico Sforza no como pintor sino como ingeniero militar, arquitecto e inventor.',                                                                                                      'La carta que Leonardo envió a Sforza para presentarse es uno de los documentos más reveladore de su autoconciencia: lista sus capacidades como constructor de puentes, máquinas de guerra, canales y armas, y menciona casi de pasada que también pinta. En Milán pasará casi dos décadas, producirá La Virgen de las Rocas y La Última Cena, diseñará máquinas hidráulicas e iniciará sus cuadernos de anatomía. La corte milanesa le dará los recursos y la estabilidad que necesitaba para explorar sin restricciones.'),
          (2, '1495-1498', 'Obra maestra',            'La Última Cena: la pintura que reinventó la narración visual', 'Leonardo pinta La Última Cena en el refectorio de Santa Maria delle Grazie, creando una de las obras más influyentes de la historia del arte.',                                                                                     'La Última Cena no es solo una obra maestra técnica: es una revolución narrativa. Leonardo captura el instante exacto en que Cristo anuncia que uno de los apóstoles lo traicionará, y retrata las reacciones individuales de cada uno con una psicología visual sin precedentes. Su técnica experimental con temple y óleo sobre yeso —en lugar del fresco tradicional— causó su deterioro precoz, pero también preservó la complejidad de la superficie que ningún fresco hubiera permitido.'),
          (3, '1503-1506', 'Florencia',               'La Mona Lisa: el retrato que cambió la pintura occidental',   'De regreso en Florencia, Leonardo pinta el retrato de Lisa Gherardini, esposa de Francesco del Giocondo, que se convertiría en la obra de arte más famosa del mundo.',                                                                 'La Mona Lisa condensó décadas de experimentación técnica: el sfumato —la técnica de difuminar contornos para crear profundidad atmosférica— alcanza aquí su máxima expresión, y la ambigüedad de la sonrisa fue lograda mediante capas de glazes translúcidos aplicados durante años. Leonardo nunca entregó la obra al comitente y la llevó consigo hasta Francia. Hoy es la pintura más estudiada, reproducida y visitada de la historia.'),
          (4, '1507-1513', 'Investigación científica','Estudios anatómicos en Milán y Roma',                         'Leonardo realiza disecciones sistemáticas de cadáveres humanos, produciendo los estudios anatómicos más precisos de su época.',                                                                                                          'Con permiso de hospitales de Milán y Roma, Leonardo diseccionó al menos treinta cadáveres y documentó sus hallazgos en más de 240 dibujos de una precisión que no sería igualada hasta el siglo XIX. Describió con exactitud el corazón, el sistema vascular, el feto en el útero y la columna vertebral. Su objetivo no era la medicina sino la comprensión: quería entender la máquina humana de la misma forma en que estudiaba una rueda hidráulica o el vuelo de un pájaro.'),
          (5, '1516-1519', 'Francia',                 'Último refugio en Amboise: la corte de Francisco I',          'Invitado por el rey Francisco I de Francia como ''primer pintor, arquitecto e ingeniero del rey'', Leonardo pasa sus últimos años en el castillo de Cloux, cerca de Amboise.',                                                          'Francisco I admiraba a Leonardo con una devoción casi filial: le dio el castillo de Cloux como residencia, una pensión anual y, sobre todo, libertad total para trabajar en lo que quisiera. Leonardo ya no pintaba mucho —una parálisis parcial del brazo derecho lo limitaba— pero seguía dibujando, escribiendo y planificando proyectos de ingeniería civil para el reino. Murió el 2 de mayo de 1519, con el rey, según la leyenda, sosteniendo su cabeza.')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(sort_order, name, role, dynamic) AS (
        VALUES
          (0, 'Andrea del Verrocchio',   'Maestro y mentor formativo',                  'Verrocchio fue quien moldeó a Leonardo como artista y artesano: en su taller aprendió que la belleza requería rigor técnico, que la escultura y la pintura eran complementarias y que la observación directa de la naturaleza era superior a cualquier regla académica. La tradición de que Verrocchio abandonó la pintura al ver el talento de su aprendiz captura algo real: la relación entre ambos fue de formación y superación.'),
          (1, 'Ludovico Sforza',         'Mecenas y primer gran patrón',                 'Sforza le dio a Leonardo lo que ningún artista florentino podía ofrecer: recursos, tiempo y la posibilidad de trabajar en proyectos a gran escala durante años. A cambio, Leonardo organizó fiestas, diseñó fortificaciones y pintó retratos de la corte. Fue una relación de mutua utilidad que produjo algunas de las obras más importantes de la historia del arte y de la ingeniería renacentista.'),
          (2, 'Miguel Ángel Buonarroti', 'Rival generacional y contrapunto artístico',   'Miguel Ángel y Leonardo se detestaban con la elegancia de dos genios que saben que el otro es su único par. Leonardo encontraba a Miguel Ángel arrogante y demasiado obsesionado con el cuerpo masculino; Miguel Ángel consideraba a Leonardo inconstante y frívolo. Su rivalidad en Florencia —encargados simultáneamente de pintar murales en el Palazzo della Signoria— fue el duelo artístico más esperado del Renacimiento. Ninguno lo terminó.'),
          (3, 'El Renacimiento italiano','Contexto histórico y cultural',                'Leonardo es inseparable del Renacimiento: el movimiento cultural que recuperó el saber clásico, situó al ser humano en el centro del universo y financió la experimentación artística e intelectual mediante el mecenazgo de familias como los Medici y las cortes principescas. Sin ese contexto de fertilización cruzada entre humanismo, comercio y arte, el proyecto intelectual de Leonardo no habría tenido ni los recursos ni el vocabulario para existir.')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      mapping(timeline_sort_order, relationship_sort_order) AS (
        VALUES
          (0, 0),
          (0, 3),
          (1, 1),
          (2, 1),
          (3, 2),
          (3, 3),
          (4, 3)
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(sort_order, label, prompt, note, cta_label) AS (
        VALUES
          (0, 'Arte y ciencia',       'Leonardo, para ti la pintura era una ciencia y la anatomía era casi un arte. ¿Cómo explicarías hoy, a alguien que los considera mundos separados, por qué son la misma cosa?',                                                                                   'Abre la conversación sobre su concepción unificada del conocimiento, su método de observación y la relación entre ver con precisión y crear con belleza.',                                                             'Inicio'),
          (1, 'Proyectos inacabados', 'Dejaste inacabada la Batalla de Anghiari, el Gran Caballo de Milán, y docenas de pinturas y máquinas. ¿Era perfeccionismo, distracción, o había algo en terminar que te resultaba insoportable?',                                                              'Invita a explorar la psicología del genio, la relación entre curiosidad y conclusión, y si los proyectos inacabados son fracasos o formas de mantener la posibilidad abierta.',                                       'Inicio'),
          (2, 'Los cuadernos',        'En tus cuadernos diseñaste helicópteros, robots y paneles solares cinco siglos antes de que existieran. ¿Sabías que eran imposibles de construir en tu tiempo, o simplemente no te importaba?',                                                               'Explora la dimensión visionaria de Leonardo, su relación con el tiempo y la tecnología, y si el valor de una idea depende de que pueda ser realizada.',                                                              'Inicio')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(sort_order, is_cover, image_url, alt, caption, credit, source_url) AS (
        VALUES
          (0, true,  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/800px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',  'La Mona Lisa de Leonardo da Vinci, Museo del Louvre',                           'La Mona Lisa (c. 1503-1519), óleo sobre tabla de álamo, conservada en el Museo del Louvre de París. Es la obra de arte más visitada, estudiada y reproducida del mundo. La ambigüedad de su sonrisa, lograda mediante la técnica del sfumato, y la profundidad atmosférica del paisaje de fondo siguen siendo objeto de análisis científico y artístico cinco siglos después de su creación.',              'Leonardo da Vinci, c. 1503-1519. Dominio público. Wikimedia Commons / C2RMF.',  'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg'),
          (1, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/%C3%9Altima_Cena_-_Da_Vinci_5.jpg/1280px-%C3%9Altima_Cena_-_Da_Vinci_5.jpg',                                                         'La Última Cena de Leonardo da Vinci en Santa Maria delle Grazie, Milán',        'La Última Cena (1495-1498), temple y óleo sobre yeso, en el refectorio de Santa Maria delle Grazie, Milán. La obra captura el momento en que Cristo anuncia la traición inminente, retratando las reacciones individuales de los doce apóstoles con una psicología visual sin precedentes en la historia del arte. A pesar del deterioro causado por la técnica experimental de Leonardo, sigue siendo uno de los murales más influyentes jamás creados.',                                              'Leonardo da Vinci, 1495-1498. Dominio público. Wikimedia Commons.',             'https://commons.wikimedia.org/wiki/File:%C3%9Altima_Cena_-_Da_Vinci_5.jpg'),
          (2, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Da_Vinci_Vitruve_Luc_Viatour.jpg/800px-Da_Vinci_Vitruve_Luc_Viatour.jpg',                                                            'El Hombre de Vitruvio de Leonardo da Vinci',                                    'El Hombre de Vitruvio (c. 1490), pluma y tinta sobre papel, conservado en las Galerías de la Academia de Venecia. El dibujo ilustra las proporciones ideales del cuerpo humano según el arquitecto romano Vitruvio, pero va más allá: representa la convicción de Leonardo de que el ser humano es la medida de todas las cosas y que el arte y la matemática pueden coincidir en la misma imagen. Es el símbolo más reconocible del humanismo renacentista.',                                         'Leonardo da Vinci, c. 1490. Dominio público. Wikimedia Commons / Luc Viatour.', 'https://commons.wikimedia.org/wiki/File:Da_Vinci_Vitruve_Luc_Viatour.jpg'),
          (3, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Leonardo_da_Vinci_-_Anatomical_studies_of_the_shoulder.jpg/800px-Leonardo_da_Vinci_-_Anatomical_studies_of_the_shoulder.jpg',       'Estudios anatómicos del hombro por Leonardo da Vinci',                          'Estudios anatómicos del hombro (c. 1510), pluma y tinta, de los cuadernos de Leonardo conservados en la Biblioteca Real de Windsor. Estos dibujos, realizados a partir de disecciones directas, son de una precisión que no sería igualada en la literatura médica hasta el siglo XIX. Para Leonardo, el cuerpo humano era la máquina más perfecta de la naturaleza y estudiarlo era tanto un acto científico como artístico.',                                                                         'Leonardo da Vinci, c. 1510. Dominio público. Wikimedia Commons.',               'https://commons.wikimedia.org/wiki/File:Leonardo_da_Vinci_-_Anatomical_studies_of_the_shoulder.jpg')
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
        SELECT id FROM public.app_character WHERE name = 'Leonardo da Vinci'
      ),
      seed_data(block_key, title, body, page_key, sort_order) AS (
        VALUES
          ('overview_intro',    'Sobre Leonardo da Vinci',      'Leonardo da Vinci es el argumento más poderoso contra la idea de que el arte y la ciencia son mundos separados. Para él, pintar era una forma de investigar y diseccionar cadáveres era una forma de crear. Sus cuadernos —llenos de máquinas que no se construirían hasta siglos después, anatomías de una precisión asombrosa y reflexiones sobre la naturaleza de la luz— son tan importantes como sus pinturas. Conversar con él es sumergirse en una mente que no acepta que ninguna pregunta esté fuera de su competencia.',                                                                                                                                              'overview',     0),
          ('voice_description', 'Su voz y manera de conversar', 'Leonardo piensa en imágenes y razona por analogías: si explica el movimiento del agua, lo compara con el movimiento del cabello; si habla de la luz, llega inevitablemente al ojo y desde allí al alma. Su curiosidad es contagiosa y su paciencia para observar, infinita. No teme contradecirse entre el Leonardo de los cuadernos y el de las pinturas — para él son el mismo proyecto. Si le preguntas por qué dejó tanto sin terminar, lo tomará como la pregunta más interesante que puedes hacerle.', 'conversation', 0)
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
      WHERE eb.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_gallery_image gi
      USING public.app_character c
      WHERE gi.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_prompt p
      USING public.app_character c
      WHERE p.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_relationship tr
      USING public.app_character_timeline_entry te, public.app_character c
      WHERE tr.timeline_entry_id = te.id
        AND te.character_id = c.id
        AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_relationship r
      USING public.app_character c
      WHERE r.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_entry te
      USING public.app_character c
      WHERE te.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_context_card cc
      USING public.app_character c
      WHERE cc.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_fact f
      USING public.app_character c
      WHERE f.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_quote q
      USING public.app_character c
      WHERE q.character_id = c.id AND c.name = 'Leonardo da Vinci'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character WHERE name = 'Leonardo da Vinci'
    `);
  }
}
