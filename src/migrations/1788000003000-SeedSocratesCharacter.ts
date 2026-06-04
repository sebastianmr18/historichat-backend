import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedSocratesCharacter1788000003000 implements MigrationInterface {
  name = "SeedSocratesCharacter1788000003000";

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
        'Sócrates',
        'socrates',
        'Filósofo y fundador del método dialéctico occidental',
        'Sócrates nació en Atenas alrededor del año 470 a.C., hijo de Sofronisco, un escultor o cantero, y de Fenareta, partera. Esta doble herencia artesanal no fue para él una metáfora vacía: se describía a sí mismo como un partero de ideas, alguien que no enseña sino que ayuda a los otros a dar a luz el conocimiento que ya llevan dentro. Creció en la Atenas de Pericles, la ciudad más vibrante intelectual y políticamente del mundo griego, en plena efervescencia democrática y cultural.

A diferencia de los sofistas de su época, Sócrates no cobró nunca por enseñar, no dejó escritos y no fundó una escuela formal. Su método era la conversación: recorría el ágora, los gimnasios y los banquetes atenienses interpelando a políticos, artesanos, poetas y generales con preguntas aparentemente simples —¿qué es la valentía?, ¿qué es la justicia?, ¿qué es la piedad?— que invariablemente revelaban la ignorancia del interlocutor y, en el proceso, abrían el camino hacia una comprensión más auténtica.

Este método, conocido como mayéutica o dialéctica socrática, partía de una premisa radicalmente humilde: ''Solo sé que no sé nada.'' La ironía socrática no era cinismo sino estrategia: fingir ignorancia para guiar al interlocutor a descubrir sus propias contradicciones. El resultado era incómodo para muchos, y la popularidad de Sócrates entre los jóvenes aristócratas atenienses generó una animadversión creciente entre las élites políticas y religiosas de la ciudad.

Participó en varias campañas militares como hoplita, donde fue reconocido por su valentía y resistencia física. Pero su verdadero campo de batalla fue siempre intelectual. Tuvo discípulos de gran peso histórico —Platón, Alcibíades, Jenofonte— cuyas obras son la principal fuente sobre su pensamiento, ya que el propio Sócrates no escribió nada.

En el año 399 a.C., a los setenta años, fue juzgado ante quinientos ciudadanos atenienses acusado de impiedad y de corromper a la juventud. En su defensa, recogida en la ''Apología'' de Platón, no buscó la absolución a cualquier precio sino que defendió la filosofía como un deber sagrado. Fue condenado a muerte y, rechazando la posibilidad de huir que le ofrecieron sus amigos, bebió la cicuta con una serenidad que sus discípulos recordarían como el acto filosófico definitivo. Murió como vivió: coherente.',
        'Sócrates es el filósofo que no escribió nada y lo cambió todo. Su método de preguntas —la mayéutica— transformó el pensamiento occidental al poner el autoconocimiento y el examen crítico de las ideas en el centro de la vida filosófica. Murió condenado por Atenas, pero su legado sobrevivió a través de Platón y Aristóteles, fundando la filosofía tal como la conocemos.',
        '470 a.C. - 399 a.C.',
        'Filosofía',
        'Grecia clásica',
        'Solo sé que no sé nada.',
        'Atenas, el Ágora, el Pritaneo, la prisión',
        'editorial_v1',
        '["Irónico", "Incisivo", "Humilde", "Incansable", "Provocador"]'::jsonb,
        '["¿Y qué entiendes tú por...?", "Ayúdame a comprender...", "Quizás me equivoco, pero...", "Examinemos esto juntos."]'::jsonb,
        '["El conocimiento y sus límites", "La virtud y la vida buena", "La justicia y la política", "El alma y la muerte", "El método dialéctico y la verdad", "La responsabilidad del ciudadano"]'::jsonb,
        '#3A3A6B',
        '#6A6AAD',
        true,
        ''
      WHERE NOT EXISTS (
        SELECT 1 FROM public.app_character WHERE name = 'Sócrates'
      )
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        role = 'Filósofo y fundador del método dialéctico occidental',
        biography = 'Sócrates nació en Atenas alrededor del año 470 a.C., hijo de Sofronisco, un escultor o cantero, y de Fenareta, partera. Esta doble herencia artesanal no fue para él una metáfora vacía: se describía a sí mismo como un partero de ideas, alguien que no enseña sino que ayuda a los otros a dar a luz el conocimiento que ya llevan dentro. Creció en la Atenas de Pericles, la ciudad más vibrante intelectual y políticamente del mundo griego, en plena efervescencia democrática y cultural.

A diferencia de los sofistas de su época, Sócrates no cobró nunca por enseñar, no dejó escritos y no fundó una escuela formal. Su método era la conversación: recorría el ágora, los gimnasios y los banquetes atenienses interpelando a políticos, artesanos, poetas y generales con preguntas aparentemente simples —¿qué es la valentía?, ¿qué es la justicia?, ¿qué es la piedad?— que invariablemente revelaban la ignorancia del interlocutor y, en el proceso, abrían el camino hacia una comprensión más auténtica.

Este método, conocido como mayéutica o dialéctica socrática, partía de una premisa radicalmente humilde: ''Solo sé que no sé nada.'' La ironía socrática no era cinismo sino estrategia: fingir ignorancia para guiar al interlocutor a descubrir sus propias contradicciones. El resultado era incómodo para muchos, y la popularidad de Sócrates entre los jóvenes aristócratas atenienses generó una animadversión creciente entre las élites políticas y religiosas de la ciudad.

Participó en varias campañas militares como hoplita, donde fue reconocido por su valentía y resistencia física. Pero su verdadero campo de batalla fue siempre intelectual. Tuvo discípulos de gran peso histórico —Platón, Alcibíades, Jenofonte— cuyas obras son la principal fuente sobre su pensamiento, ya que el propio Sócrates no escribió nada.

En el año 399 a.C., a los setenta años, fue juzgado ante quinientos ciudadanos atenienses acusado de impiedad y de corromper a la juventud. En su defensa, recogida en la ''Apología'' de Platón, no buscó la absolución a cualquier precio sino que defendió la filosofía como un deber sagrado. Fue condenado a muerte y, rechazando la posibilidad de huir que le ofrecieron sus amigos, bebió la cicuta con una serenidad que sus discípulos recordarían como el acto filosófico definitivo. Murió como vivió: coherente.',
        description = 'Sócrates es el filósofo que no escribió nada y lo cambió todo. Su método de preguntas —la mayéutica— transformó el pensamiento occidental al poner el autoconocimiento y el examen crítico de las ideas en el centro de la vida filosófica. Murió condenado por Atenas, pero su legado sobrevivió a través de Platón y Aristóteles, fundando la filosofía tal como la conocemos.',
        years = '470 a.C. - 399 a.C.',
        category = 'Filosofía',
        epoch = 'Grecia clásica',
        quote = 'Solo sé que no sé nada.',
        ambient_label = 'Atenas, el Ágora, el Pritaneo, la prisión',
        content_variant = 'editorial_v1',
        key_traits = '["Irónico", "Incisivo", "Humilde", "Incansable", "Provocador"]'::jsonb,
        speech_tics = '["¿Y qué entiendes tú por...?", "Ayúdame a comprender...", "Quizás me equivoco, pero...", "Examinemos esto juntos."]'::jsonb,
        topics = '["El conocimiento y sus límites", "La virtud y la vida buena", "La justicia y la política", "El alma y la muerte", "El método dialéctico y la verdad", "La responsabilidad del ciudadano"]'::jsonb,
        theme_color = '#3A3A6B',
        theme_color_light = '#6A6AAD'
      WHERE name = 'Sócrates'
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(sort_order, is_featured, text, attribution) AS (
        VALUES
          (0, true,  'Solo sé que no sé nada.',                                                                                                    'Sócrates'),
          (1, false, 'Una vida sin examen no merece ser vivida.',                                                                                  'Sócrates, Apología'),
          (2, false, 'Conócete a ti mismo.',                                                                                                       'Sócrates'),
          (3, false, 'No me importa morir, si es que muero; lo que me importa es no hacer nada injusto ni impío.',                                 'Sócrates, Apología'),
          (4, false, 'El hombre más sabio que jamás conocí fue aquel que reconoció que no sabía nada.',                                            'Sócrates')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(section_key, sort_order, label, value) AS (
        VALUES
          ('quick_facts', 0, 'Origen',             'Atenas, Grecia clásica'),
          ('quick_facts', 1, 'Período de actividad','Siglo V a.C., durante el apogeo de la democracia ateniense'),
          ('quick_facts', 2, 'Método filosófico',  'Mayéutica: preguntas que ayudan al interlocutor a descubrir la verdad'),
          ('quick_facts', 3, 'Rasgo singular',     'Nunca escribió nada; su pensamiento llega a través de Platón y Jenofonte'),
          ('quick_facts', 4, 'Discípulos notables','Platón, Alcibíades, Jenofonte, Antístenes'),
          ('quick_facts', 5, 'Causa de muerte',    'Condenado a beber cicuta por impiedad y corrupción de la juventud, 399 a.C.')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(page_key, sort_order, eyebrow, title, body, icon_key) AS (
        VALUES
          ('overview',     0, 'Biografía histórica',        'El filósofo que vivió en el ágora y murió por sus ideas',          'Sócrates no tuvo escuela ni escribió libros: su filosofía era la conversación misma. Recorría Atenas interpelando a cualquiera dispuesto a pensar junto a él, desde políticos hasta zapateros, sin cobrar y sin conceder autoridad a nadie solo por su cargo o reputación. Esta radicalidad democrática en la búsqueda de la verdad lo hizo tan querido entre los jóvenes como incómodo entre los poderosos.',                                                                                                                                                                                                                                                                  'lightbulb'),
          ('overview',     1, 'Legado filosófico',          'La mayéutica: el arte de hacer parir ideas',                       'El método socrático no enseña: interroga. Parte de la premisa de que el conocimiento verdadero no se transmite desde fuera sino que se descubre desde dentro, cuando las contradicciones de nuestras creencias quedan al descubierto. Esta inversión —el filósofo como partero, no como maestro— fundó una tradición intelectual que llega hasta el pensamiento crítico contemporáneo y sigue siendo el modelo del debate filosófico riguroso.',                                                                                                                                                                                                                        'sparkles'),
          ('overview',     2, 'Contexto histórico',         'Atenas en el siglo V a.C.: democracia, guerra y pensamiento',      'Sócrates vivió en la Atenas que construyó el Partenón, inventó la democracia directa y libró las Guerras del Peloponeso. Era una ciudad intelectualmente efervescente pero también políticamente frágil: la derrota frente a Esparta dejó una sociedad traumatizada, desconfiada y necesitada de chivos expiatorios. El juicio de Sócrates se produjo en ese clima de crisis posguerra, cuando la ciudad buscaba recuperar su cohesión.',                                                                                                                                                                                                                          'globe'),
          ('conversation', 0, 'Cómo conversar con Sócrates','Prepárate para ser cuestionado, no para recibir respuestas',       'Sócrates no da lecciones magistrales: hace preguntas. Si le dices que sabes algo, te preguntará qué entiendes exactamente por eso. Si afirmas una verdad, te pedirá que la examines. La conversación con él es un espejo que refleja los supuestos que damos por sentados. La experiencia puede ser incómoda —los atenienses lo llamaban ''el tábano''— pero también profundamente reveladora. Llega con disposición a dudar.',                                                                                                                                                                                                                                     'compass')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(sort_order, year_label, phase_label, title, description, narrative_text) AS (
        VALUES
          (0, '470 a.C.',       'Origen',                   'Nacimiento en Atenas',                                          'Sócrates nace en Atenas en el seno de una familia artesana, en la misma ciudad que será escenario de toda su vida y de su muerte.',                                                                                          'La Atenas en que nace Sócrates acaba de salir victoriosa de las Guerras Médicas contra Persia y está en el umbral de su siglo de oro. Su padre Sofronisco es escultor y su madre Fenareta, partera — dos oficios que Sócrates convertirá en metáforas centrales de su filosofía: el que da forma y el que ayuda a dar a luz. Crece en un ambiente artesano pero en una ciudad que fermentará intelectualmente durante toda su vida.'),
          (1, '431-404 a.C.',   'Participación ciudadana',  'Hoplita en la Guerra del Peloponeso',                           'Sócrates participa como soldado de infantería en varias batallas de la Guerra del Peloponeso, destacándose por su valentía y resistencia.',                                                                                        'En las batallas de Potidea, Delio y Anfípolis, Sócrates sirve como hoplita y es recordado por quienes combatieron junto a él como un soldado de una entereza física y mental extraordinaria. Alcibíades, su discípulo más brillante y turbulento, lo describe salvándole la vida en combate. Esta dimensión guerrera contrasta con la imagen del filósofo abstracto: Sócrates era un ciudadano completo en la Atenas democrática.'),
          (2, 'c. 420 a.C.',    'Madurez filosófica',       'El oráculo de Delfos y la misión filosófica',                   'Querefonte consulta al oráculo de Delfos, que declara que no hay nadie más sabio que Sócrates, iniciando su misión de examinar a los que se consideran sabios.',                                                                   'Al enterarse de que el oráculo lo había proclamado el hombre más sabio de Atenas, Sócrates lo interpretó como un enigma que debía resolver: si él no sabía nada, ¿cómo podía ser el más sabio? Decidió interrogar a políticos, poetas y artesanos que se tenían por sabios, y descubrió que ninguno lo era realmente. Concluyó que su única ventaja era saber que no sabía — y que esa conciencia de la propia ignorancia era ya una forma de sabiduría. Esta revelación definió el resto de su vida.'),
          (3, 'c. 410-400 a.C.','Tensión política',         'El tábano de Atenas: conflicto con los poderosos',              'La actividad filosófica de Sócrates lo enfrenta progresivamente a la élite política y religiosa ateniense, especialmente tras la derrota en la Guerra del Peloponeso.',                                                               'La derrota frente a Esparta en el 404 a.C. sumió a Atenas en una crisis política y moral. Algunos discípulos de Sócrates —Critias, Alcibíades— estuvieron asociados al régimen oligárquico de los Treinta Tiranos, lo que manchó su reputación pública. Aunque Sócrates nunca apoyó la oligarquía y desafió incluso las órdenes de los tiranos, la asociación fue usada en su contra. Atenas, reconstruyéndose tras el trauma, buscaba estabilidad y veía en el filósofo un factor de perturbación.'),
          (4, '399 a.C.',       'Juicio',                   'El juicio de Sócrates ante la asamblea ateniense',              'Sócrates es acusado de impiedad y corrupción de la juventud, juzgado ante quinientos ciudadanos y condenado a muerte por una mayoría ajustada.',                                                                                       'Los acusadores —Meleto, Anito y Licón— presentaron cargos de impiedad hacia los dioses y de corrupción de los jóvenes. En su defensa, recogida por Platón en la ''Apología'', Sócrates no buscó la absolución sino que defendió la filosofía como un mandato divino y afirmó que prefería morir antes que abandonar el examen de las ideas. Fue condenado por 280 votos contra 220. Cuando se le ofreció proponer una pena alternativa al destierro, respondió con ironía que merecía ser alimentado gratuitamente en el Pritaneo — lo que irritó al jurado y aseguró la condena de muerte.'),
          (5, '399 a.C.',       'Muerte',                   'La muerte de Sócrates: filosofía hasta el final',               'Sócrates rechaza la posibilidad de huir y bebe la cicuta rodeado de sus discípulos, convirtiendo su muerte en el último acto filosófico de su vida.',                                                                               'Sus amigos, entre ellos Critón, organizaron su fuga de la prisión. Sócrates se negó: hacerlo sería contradecir toda su vida de respeto a las leyes de Atenas, aunque esas mismas leyes le hubieran condenado injustamente. Pasó sus últimas horas discutiendo sobre la inmortalidad del alma con sus discípulos, como recoge el ''Fedón'' de Platón. Bebió la cicuta con una serenidad que dejó a todos presentes entre la admiración y el llanto. Tenía setenta años.')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(sort_order, name, role, dynamic) AS (
        VALUES
          (0, 'Platón',                    'Discípulo y transmisor de su pensamiento',        'Platón tenía unos veintiocho años cuando Sócrates murió, y el impacto de su maestro definió toda su obra filosófica. Es a través de los Diálogos de Platón que conocemos el pensamiento socrático, aunque la frontera entre lo que pensaba Sócrates y lo que Platón le atribuía es uno de los grandes problemas de la historia de la filosofía. Sin Platón, Sócrates sería un rumor; sin Sócrates, Platón no habría sido Platón.'),
          (1, 'Alcibíades',                'Discípulo brillante y relación problemática',     'Alcibíades fue el discípulo más carismático y políticamente peligroso de Sócrates: un estratega militar y político de enorme talento que acabó traicionando a Atenas. Su asociación con Sócrates fue uno de los argumentos usados en el juicio. La relación —intelectual, con tensiones personales documentadas en el ''Simposio'' de Platón— es una de las más complejas y reveladoras de la vida de Sócrates.'),
          (2, 'Los sofistas',              'Rivales intelectuales y contrapunto filosófico',  'Los sofistas —Protágoras, Gorgias, Trasímaco— eran los intelectuales profesionales de la Atenas del siglo V: cobraban por enseñar retórica y habilidades políticas, y sostenían que la verdad era relativa. Sócrates los consideraba peligrosos no por su inteligencia sino por su disposición a convencer sin buscar la verdad. La tensión entre filosofía y sofística es uno de los ejes del pensamiento socrático-platónico.'),
          (3, 'La democracia ateniense',   'Contexto político y tensión institucional',       'Sócrates vivió, combatió y murió bajo la democracia ateniense — el mismo sistema que lo condenó. Su relación con la democracia es paradójica: la respetó como institución hasta el final, pero cuestionó constantemente la idea de que la mayoría tiene razón por el hecho de ser mayoría. Su juicio plantea una pregunta que sigue abierta: ¿puede una democracia tolerar al que la cuestiona desde dentro?')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      mapping(timeline_sort_order, relationship_sort_order) AS (
        VALUES
          (1, 1),
          (2, 2),
          (3, 1),
          (3, 3),
          (4, 2),
          (4, 3),
          (5, 0),
          (5, 3)
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(sort_order, label, prompt, note, cta_label) AS (
        VALUES
          (0, 'Método socrático', 'Sócrates, ¿por qué preguntas en lugar de enseñar? Muchos maestros transmiten su conocimiento directamente, pero tú pareces empeñado en que cada uno encuentre la verdad por sí mismo. ¿Qué sabes tú que ellos no saben sobre cómo funciona el aprendizaje?',                                          'Invita a Sócrates a explicar la mayéutica desde sus propias razones, abriendo la conversación sobre epistemología, la naturaleza del conocimiento y el papel del maestro.',                                                            'Inicio'),
          (1, 'El juicio',        'En tu juicio tuviste la oportunidad de pedir el destierro y salvar tu vida. Elegiste quedarte y aceptar la condena. ¿Fue coherencia filosófica, orgullo, o había algo más en esa decisión?',                                                                                                            'Explora la dimensión política y ética de su muerte: la relación entre filosofía y obediencia civil, el valor de la coherencia, y si su decisión fue sabiduría o una forma de provocación final.',                                      'Inicio'),
          (2, 'Virtud e ignorancia','Dices que nadie hace el mal voluntariamente, que toda maldad es ignorancia. Pero vemos a personas que saben perfectamente lo que hacen y aun así hacen daño. ¿Cómo defiendes esa idea?',                                                                                                              'Abre el debate sobre la ética socrática y el intelectualismo moral, una de sus tesis más controvertidas, permitiendo una conversación filosófica densa sobre libre albedrío, conocimiento y acción.',                                  'Inicio')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(sort_order, is_cover, image_url, alt, caption, credit, source_url) AS (
        VALUES
          (0, true,  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Socrate_du_Louvre.jpg/800px-Socrate_du_Louvre.jpg',                                            'Busto de Sócrates en el Museo del Louvre',                                  'Busto romano de Sócrates conservado en el Museo del Louvre, copia de un original griego del siglo IV a.C. Es uno de los retratos más difundidos del filósofo: calvo, con barba corta y una expresión que combina serenidad e intensidad. Las fuentes antiguas describen a Sócrates como físicamente poco agraciado —nariz respingona, ojos saltones— lo que contrastaba con su excepcional presencia intelectual.',             'Marie-Lan Nguyen, 2010. CC BY 2.5. Wikimedia Commons.',       'https://commons.wikimedia.org/wiki/File:Socrate_du_Louvre.jpg'),
          (1, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/David_-_The_Death_of_Socrates.jpg/1280px-David_-_The_Death_of_Socrates.jpg',                   'La muerte de Sócrates, óleo de Jacques-Louis David',                        'La muerte de Sócrates (1787), óleo de Jacques-Louis David conservado en el Metropolitan Museum of Art de Nueva York. La pintura muestra a Sócrates en el momento de tomar la copa de cicuta, rodeado de sus discípulos en llanto mientras él señala hacia arriba, hacia el mundo de las ideas. Es una de las representaciones más influyentes de la filosofía como acto moral y político.',                                         'Jacques-Louis David, 1787. Dominio público. Wikimedia Commons.','https://commons.wikimedia.org/wiki/File:David_-_The_Death_of_Socrates.jpg'),
          (2, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/The_Acropolis_of_Athens.jpg/1280px-The_Acropolis_of_Athens.jpg',                               'Vista de la Acrópolis de Atenas',                                           'La Acrópolis de Atenas, el símbolo de la ciudad donde Sócrates nació, vivió y murió. En tiempos de Sócrates, el Partenón estaba recién terminado y la ciudad era el centro político e intelectual del mundo griego. Las calles y el ágora que se extienden a los pies de la Acrópolis fueron el escenario de las conversaciones filosóficas que fundaron la tradición occidental del pensamiento crítico.',                           'A.Savin, 2012. CC BY-SA 3.0. Wikimedia Commons.',             'https://commons.wikimedia.org/wiki/File:The_Acropolis_of_Athens.jpg'),
          (3, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Plato_and_aristotle.jpg/800px-Plato_and_aristotle.jpg',                                        'Detalle de La escuela de Atenas mostrando a Platón y Aristóteles',          'Detalle de La escuela de Atenas de Rafael Sanzio (1509-1511), mostrando a Platón señalando hacia arriba y a Aristóteles hacia la tierra. Platón, el discípulo más importante de Sócrates, es la fuente principal de conocimiento sobre su maestro. Esta imagen captura el linaje intelectual que arranca en Sócrates y atraviesa dos mil quinientos años de filosofía occidental.',                                                    'Rafael Sanzio, 1509-1511. Dominio público. Wikimedia Commons.','https://commons.wikimedia.org/wiki/File:Plato_and_aristotle.jpg')
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
        SELECT id FROM public.app_character WHERE name = 'Sócrates'
      ),
      seed_data(block_key, title, body, page_key, sort_order) AS (
        VALUES
          ('overview_intro',    'Sobre Sócrates',               'Sócrates no dejó escritos, no fundó una institución y no acumuló riqueza. Su único legado fue una forma de conversar: preguntar hasta que las certezas se disuelven y queda algo más honesto en su lugar. Esa práctica, transmitida por Platón, fundó la filosofía occidental tal como la conocemos. Conversar con Sócrates no es buscar respuestas: es aprender a formular mejores preguntas.',                                                                                                                                                                                             'overview',     0),
          ('voice_description', 'Su voz y manera de conversar', 'Sócrates escucha antes de responder y responde con preguntas. No impone tesis: acompaña al interlocutor a descubrir las suyas propias y sus contradicciones. Su ironía no es sarcasmo sino método: finge no saber para que el otro piense. Si en algún momento sientes que la conversación te desestabiliza, es señal de que está funcionando.',                                                                                                                                                                                        'conversation', 0)
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
      WHERE eb.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_gallery_image gi
      USING public.app_character c
      WHERE gi.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_prompt p
      USING public.app_character c
      WHERE p.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_relationship tr
      USING public.app_character_timeline_entry te, public.app_character c
      WHERE tr.timeline_entry_id = te.id
        AND te.character_id = c.id
        AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_relationship r
      USING public.app_character c
      WHERE r.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_entry te
      USING public.app_character c
      WHERE te.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_context_card cc
      USING public.app_character c
      WHERE cc.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_fact f
      USING public.app_character c
      WHERE f.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_quote q
      USING public.app_character c
      WHERE q.character_id = c.id AND c.name = 'Sócrates'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character WHERE name = 'Sócrates'
    `);
  }
}
