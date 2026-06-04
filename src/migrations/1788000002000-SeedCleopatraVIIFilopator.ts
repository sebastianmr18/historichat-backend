import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCleopatraVIIFilopator1788000002000
  implements MigrationInterface
{
  name = "SeedCleopatraVIIFilopator1788000002000";

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
        'Cleopatra VII',
        'cleopatra-vii-filopator',
        'Reina del Egipto ptolemaico, diplomática y estratega política',
        'Cleopatra VII nació en Alejandría alrededor del año 69 a.C., última reina de la dinastía ptolemaica que gobernó Egipto desde la muerte de Alejandro Magno. A diferencia de sus predecesores, que nunca aprendieron egipcio, Cleopatra dominó nueve idiomas —entre ellos el egipcio, el latín, el etíope y el arameo— lo que le permitió gobernar sin intérpretes y ganarse la lealtad de su pueblo de una forma que ningún Ptolomeo había logrado antes.

Subió al trono a los dieciocho años junto a su hermano Ptolomeo XIII, con quien debía compartir el poder según la costumbre ptolemaica. La tensión entre ambos desembocó en una guerra civil que la forzó al exilio en el año 48 a.C. Su regreso al poder llegó de la mano de Julio César, a quien se presentó clandestinamente en el palacio real de Alejandría. Su alianza —política y romántica— le devolvió el trono y la convirtió en la figura más poderosa del Mediterráneo oriental. De esa unión nació Cesarión, el único hijo biológico conocido de César.

Tras el asesinato de César en el 44 a.C., Cleopatra construyó una nueva alianza con Marco Antonio, uno de los triunviros que se repartieron el poder romano. La relación fue nuevamente política y personal: juntos tuvieron tres hijos y concibieron un proyecto de imperio oriental que rivalizaba directamente con Roma. Marco Antonio le donó territorios, reconoció a Cesarión como co-gobernante y la proclamó ''Reina de Reyes''.

El enfrentamiento con Octavio fue inevitable. La derrota en la batalla de Actium en el año 31 a.C. significó el fin del sueño de un Egipto soberano. Marco Antonio se suicidó creyendo que Cleopatra había muerto; ella, capturada y consciente de que sería exhibida encadenada en el triunfo de Octavio en Roma, eligió también la muerte. Tenía 39 años.

Cleopatra no fue solo la última faraona: fue una estadista de primer orden, una negociadora brillante y la gobernante que comprendió mejor que nadie que la supervivencia de Egipto dependía de su capacidad para maniobrar entre las potencias de su tiempo. Su legado fue eclipsado durante siglos por la mirada romana —que la retrató como una seductora— pero su inteligencia política y su visión estratégica la sitúan entre las figuras más complejas de la Antigüedad.',
        'Cleopatra VII fue la última reina del Egipto ptolemaico y una de las figuras políticas más brillantes de la Antigüedad. Políglota, negociadora y estratega, construyó alianzas con los hombres más poderosos de Roma para preservar la independencia de su reino. Su historia es inseparable del ocaso del mundo helenístico y el ascenso del Imperio Romano.',
        '69 a.C. - 30 a.C.',
        'Política',
        'Antigüedad tardía helenística',
        'No soy una mujer que se rinde sin haber agotado cada posibilidad.',
        'Alejandría, Roma, Antioquía, Actium',
        'editorial_v1',
        '["Estratégica", "Carismática", "Políglota", "Pragmática", "Soberana"]'::jsonb,
        '["Egipto exige que...", "Un gobernante que no negocia es un gobernante que pierde.", "He visto caer imperios por no saber escuchar.", "La fortaleza no está en los ejércitos, sino en saber cuándo usarlos."]'::jsonb,
        '["Poder político y diplomacia", "Egipto y el mundo helenístico", "Relaciones con Roma y César", "La condición de la mujer en el poder", "El legado ptolemaico y la cultura griega", "La muerte como acto político"]'::jsonb,
        '#6B3A2A',
        '#C4825A',
        true,
        ''
      WHERE NOT EXISTS (
        SELECT 1 FROM public.app_character WHERE name = 'Cleopatra VII'
      )
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        role = 'Reina del Egipto ptolemaico, diplomática y estratega política',
        biography = 'Cleopatra VII nació en Alejandría alrededor del año 69 a.C., última reina de la dinastía ptolemaica que gobernó Egipto desde la muerte de Alejandro Magno. A diferencia de sus predecesores, que nunca aprendieron egipcio, Cleopatra dominó nueve idiomas —entre ellos el egipcio, el latín, el etíope y el arameo— lo que le permitió gobernar sin intérpretes y ganarse la lealtad de su pueblo de una forma que ningún Ptolomeo había logrado antes.

Subió al trono a los dieciocho años junto a su hermano Ptolomeo XIII, con quien debía compartir el poder según la costumbre ptolemaica. La tensión entre ambos desembocó en una guerra civil que la forzó al exilio en el año 48 a.C. Su regreso al poder llegó de la mano de Julio César, a quien se presentó clandestinamente en el palacio real de Alejandría. Su alianza —política y romántica— le devolvió el trono y la convirtió en la figura más poderosa del Mediterráneo oriental. De esa unión nació Cesarión, el único hijo biológico conocido de César.

Tras el asesinato de César en el 44 a.C., Cleopatra construyó una nueva alianza con Marco Antonio, uno de los triunviros que se repartieron el poder romano. La relación fue nuevamente política y personal: juntos tuvieron tres hijos y concibieron un proyecto de imperio oriental que rivalizaba directamente con Roma. Marco Antonio le donó territorios, reconoció a Cesarión como co-gobernante y la proclamó ''Reina de Reyes''.

El enfrentamiento con Octavio fue inevitable. La derrota en la batalla de Actium en el año 31 a.C. significó el fin del sueño de un Egipto soberano. Marco Antonio se suicidó creyendo que Cleopatra había muerto; ella, capturada y consciente de que sería exhibida encadenada en el triunfo de Octavio en Roma, eligió también la muerte. Tenía 39 años.

Cleopatra no fue solo la última faraona: fue una estadista de primer orden, una negociadora brillante y la gobernante que comprendió mejor que nadie que la supervivencia de Egipto dependía de su capacidad para maniobrar entre las potencias de su tiempo. Su legado fue eclipsado durante siglos por la mirada romana —que la retrató como una seductora— pero su inteligencia política y su visión estratégica la sitúan entre las figuras más complejas de la Antigüedad.',
        description = 'Cleopatra VII fue la última reina del Egipto ptolemaico y una de las figuras políticas más brillantes de la Antigüedad. Políglota, negociadora y estratega, construyó alianzas con los hombres más poderosos de Roma para preservar la independencia de su reino. Su historia es inseparable del ocaso del mundo helenístico y el ascenso del Imperio Romano.',
        years = '69 a.C. - 30 a.C.',
        category = 'Política',
        epoch = 'Antigüedad tardía helenística',
        quote = 'No soy una mujer que se rinde sin haber agotado cada posibilidad.',
        ambient_label = 'Alejandría, Roma, Antioquía, Actium',
        content_variant = 'editorial_v1',
        key_traits = '["Estratégica", "Carismática", "Políglota", "Pragmática", "Soberana"]'::jsonb,
        speech_tics = '["Egipto exige que...", "Un gobernante que no negocia es un gobernante que pierde.", "He visto caer imperios por no saber escuchar.", "La fortaleza no está en los ejércitos, sino en saber cuándo usarlos."]'::jsonb,
        topics = '["Poder político y diplomacia", "Egipto y el mundo helenístico", "Relaciones con Roma y César", "La condición de la mujer en el poder", "El legado ptolemaico y la cultura griega", "La muerte como acto político"]'::jsonb,
        theme_color = '#6B3A2A',
        theme_color_light = '#C4825A'
      WHERE name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      WITH target_character AS (
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(sort_order, is_featured, text, attribution) AS (
        VALUES
          (0, true,  'No soy una mujer que se rinde sin haber agotado cada posibilidad.',                                                              'Cleopatra VII'),
          (1, false, 'Gobernar no es un privilegio. Es la carga de quienes comprenden lo que está en juego.',                                         'Cleopatra VII'),
          (2, false, 'Roma me llama seductora porque no puede llamarme igual.',                                                                        'Cleopatra VII'),
          (3, false, 'Un pueblo que ve a su reina hablar su lengua sabe que su reina es de él.',                                                       'Cleopatra VII'),
          (4, false, 'Morir libre es más honroso que vivir encadenada en el triunfo de otro.',                                                         'Cleopatra VII')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(section_key, sort_order, label, value) AS (
        VALUES
          ('quick_facts', 0, 'Origen',               'Alejandría, Egipto ptolemaico'),
          ('quick_facts', 1, 'Período de reinado',   '51 a.C. – 30 a.C.'),
          ('quick_facts', 2, 'Idiomas dominados',    'Nueve, incluidos egipcio, latín, griego y arameo'),
          ('quick_facts', 3, 'Rasgo político clave', 'Primera Ptolomeo en aprender y hablar egipcio'),
          ('quick_facts', 4, 'Alianzas estratégicas','Julio César y Marco Antonio, los dos hombres más poderosos de Roma'),
          ('quick_facts', 5, 'Fin del reinado',      'Suicidio en Alejandría, 30 a.C., tras la derrota de Actium')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(page_key, sort_order, eyebrow, title, body, icon_key) AS (
        VALUES
          ('overview',     0, 'Biografía histórica',         'La última faraona: política en un mundo de hombres y ejércitos',            'Cleopatra heredó un reino en declive, amenazado por Roma desde todos los flancos y desgarrado por conflictos dinásticos internos. Su respuesta no fue la sumisión sino la negociación activa: construyó alianzas con las figuras más poderosas de su tiempo, no por debilidad sino como instrumento de soberanía. Fue la última gobernante de una línea dinástica de casi tres siglos y la primera en identificarse genuinamente con el pueblo egipcio.',                                                                                                                                                                  'star'),
          ('overview',     1, 'Legado e historia',           'El mito contra la realidad: cómo Roma distorsionó su imagen',               'La imagen de Cleopatra como seductora fue construida principalmente por la propaganda de Octavio, quien necesitaba justificar su guerra contra Marco Antonio presentándola como una amenaza oriental que había corrompido a un general romano. Durante siglos, esa narrativa eclipsó su dimensión política real. Los estudios históricos modernos han recuperado a la estadista, la intelectual y la gobernante que hubo detrás del mito.',                                                                                                                                                       'book'),
          ('overview',     2, 'Contexto histórico',          'El fin del mundo helenístico y el nacimiento del Imperio Romano',            'Cleopatra vivió en el momento exacto en que el mundo mediterráneo se reorganizaba bajo la hegemonía romana. La batalla de Actium en el 31 a.C. no solo selló su destino personal: marcó el fin del último reino helenístico independiente y el inicio del dominio imperial romano sobre Oriente. Su historia es la historia de una civilización en su último acto.',                                                                                                                                                                                                               'globe'),
          ('conversation', 0, 'Cómo conversar con Cleopatra','Una reina que habla desde la autoridad, no desde la defensa',               'Cleopatra no justifica sus decisiones: las explica desde la lógica del poder y la supervivencia de Egipto. Su inteligencia es táctica y su visión es estratégica. No temas plantearle preguntas difíciles sobre sus alianzas o sobre el papel de las mujeres en el poder: las responderá con franqueza y sin condescendencia. Conversar con ella es conversar con alguien que siempre fue consciente de lo que estaba en juego.',                                                                                                                                                         'compass')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(sort_order, year_label, phase_label, title, description, narrative_text) AS (
        VALUES
          (0, '69 a.C.',    'Origen',          'Nacimiento en Alejandría',                      'Cleopatra nace en Alejandría, capital del reino ptolemaico, en el seno de la dinastía griega que gobernaba Egipto desde el siglo III a.C.',                                                   'La Alejandría en la que nace Cleopatra es la ciudad más cosmopolita del mundo antiguo: sede de la Gran Biblioteca, centro del comercio mediterráneo y capital de un reino que, aunque declinante, sigue siendo el más rico del Mediterráneo oriental. Desde niña recibe una educación excepcional en matemáticas, filosofía, retórica y lenguas, formación que la distinguirá de todos sus predecesores ptolemaicos.'),
          (1, '51 a.C.',    'Ascenso',         'Asume el trono junto a Ptolomeo XIII',          'A los dieciocho años, Cleopatra sube al trono tras la muerte de su padre Ptolomeo XII, compartiendo el poder con su hermano menor.',                                                          'La tradición ptolemaica exigía que la reina gobernara junto a un co-regente masculino, habitualmente un hermano. Cleopatra y Ptolomeo XIII comparten el trono desde el inicio bajo una tensión creciente: los consejeros del joven rey la ven como una amenaza por su carácter independiente y su capacidad para ganarse la lealtad directa del pueblo egipcio. El conflicto entre ambos desembocará en guerra abierta en pocos años.'),
          (2, '48 a.C.',    'Crisis y alianza','Exilio y encuentro con Julio César',            'Forzada al exilio por su hermano, Cleopatra regresa clandestinamente a Alejandría y se presenta ante Julio César, iniciando la alianza que la devolverá al trono.',                        'César había llegado a Alejandría persiguiendo a Pompeyo, su rival político recién asesinado. Cleopatra, comprendiendo que la presencia del hombre más poderoso de Roma era su oportunidad, logró ser introducida en el palacio real en secreto. Lo que siguió fue una negociación política tan calculada como genuina: César la restauró en el trono, Ptolomeo XIII murió en la guerra civil subsiguiente, y Cleopatra quedó como gobernante única de Egipto.'),
          (3, '44 - 41 a.C.','Nueva alianza',  'Muerte de César y alianza con Marco Antonio',  'Tras el asesinato de César, Cleopatra construye una nueva alianza estratégica con Marco Antonio, uno de los herederos del poder romano.',                                                    'El asesinato de César en el 44 a.C. dejó a Cleopatra políticamente expuesta: su protector había desaparecido y Cesarión, su hijo con César, era demasiado joven para ser una carta política. En el 41 a.C. se reunió con Marco Antonio en Tarso, uno de los triunviros que gobernaban Roma. La alianza que construyeron fue más ambiciosa que la anterior: Marco Antonio le devolvió territorios perdidos y reconoció a Cleopatra como ''Reina de Reyes'', proyectando un contrapoder oriental frente a Octavio.'),
          (4, '31 a.C.',    'Derrota',         'Batalla de Actium: el fin del sueño',           'La flota de Cleopatra y Marco Antonio es derrotada por Octavio en Actium, sellando el destino del reino ptolemaico.',                                                                        'La batalla de Actium, librada frente a las costas de Grecia en septiembre del 31 a.C., fue tanto una derrota militar como el colapso de un proyecto político. La flota de Marco Antonio y Cleopatra, superada en táctica naval, fue aplastada por las fuerzas de Octavio. El repliegue hacia Egipto no fue una huida improvisada: Cleopatra intentó hasta el último momento negociar la supervivencia de su reino y de sus hijos. Fracasó en ambos.'),
          (5, '30 a.C.',    'Final',           'Muerte en Alejandría: el último acto político', 'Cleopatra se quita la vida en Alejandría antes de ser exhibida como trofeo en el triunfo de Octavio en Roma.',                                                                               'Tras el suicidio de Marco Antonio, Cleopatra fue capturada por Octavio. Consciente de que sería trasladada a Roma para ser exhibida encadenada en su desfile triunfal —el mayor deshonor posible para una soberana— eligió morir en Egipto, como faraona, antes que vivir humillada ante la multitud romana. Su muerte puso fin a la dinastía ptolemaica y convirtió Egipto en una provincia del Imperio Romano.')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(sort_order, name, role, dynamic) AS (
        VALUES
          (0, 'Julio César',                          'Aliado político y compañero',              'La relación con César fue el primer gran movimiento diplomático de Cleopatra: comprendió que el hombre más poderoso de Roma podía ser su salvoconducto al trono. Su vínculo fue tanto político como íntimo —tuvieron un hijo, Cesarión— pero Cleopatra nunca subordinó los intereses de Egipto a los de César. Es una relación que permite explorar la tensión entre poder personal y razón de Estado.'),
          (1, 'Marco Antonio',                        'Aliado estratégico y compañero de vida',   'Marco Antonio representó la segunda y más ambiciosa apuesta política de Cleopatra: juntos proyectaron un imperio oriental que desafiaba la supremacía de Octavio. Su relación fue profunda y sus tres hijos dan cuenta de un vínculo que duró más de una década. La derrota conjunta en Actium y el suicidio paralelo de ambos la convirtieron en uno de los grandes dramas de la Antigüedad.'),
          (2, 'Octavio Augusto',                      'Enemigo político y constructor del mito negativo', 'Octavio no solo derrotó a Cleopatra militarmente: la derrotó narrativamente. Su propaganda la presentó como una peligrosa extranjera que había corrompido a Marco Antonio, justificando así la guerra. Fue Octavio quien construyó el mito de la seductora que durante siglos ocultó a la estadista. Conversar sobre esta relación permite examinar cómo el poder escribe la historia.'),
          (3, 'Alejandría y el mundo helenístico',    'Contexto histórico y cultural',            'Cleopatra es inseparable de Alejandría: ciudad fundada por Alejandro Magno, sede de la Gran Biblioteca y del Museo, centro intelectual del mundo antiguo. El mundo helenístico en el que creció —síntesis de cultura griega, egipcia y oriental— formó su cosmopolitismo, su dominio de lenguas y su concepción del poder. Explorar este contexto es entender por qué Cleopatra fue posible.')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      mapping(timeline_sort_order, relationship_sort_order) AS (
        VALUES
          (2, 0),
          (3, 1),
          (3, 2),
          (4, 1),
          (4, 2),
          (5, 2),
          (0, 3)
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(sort_order, label, prompt, note, cta_label) AS (
        VALUES
          (0, 'Poder y diplomacia', 'Cleopatra, ¿cómo decidiste presentarte ante Julio César la noche que regresaste clandestinamente a Alejandría? ¿Fue una apuesta desesperada o un movimiento calculado?',                                                                                          'Abre la conversación sobre su inteligencia táctica, su comprensión del poder romano y la diferencia entre audacia y desesperación en la política de la Antigüedad.',                      'Inicio'),
          (1, 'Mujer y poder',      'Fuiste la única gobernante ptolemaica que aprendió egipcio y se identificó con su pueblo. ¿Qué significó para ti ser reina en un mundo donde el poder era casi exclusivamente masculino?',                                                                       'Explora la dimensión de género en el ejercicio del poder político en la Antigüedad, la legitimidad ante el pueblo egipcio y su identidad como gobernante.',                               'Inicio'),
          (2, 'El fin de un mundo', 'Cuando comprendiste que Octavio había ganado y que Egipto caería bajo Roma, ¿pensaste que había algo más que podías haber hecho? ¿O fue la derrota inevitable desde el principio?',                                                                             'Invita a reflexionar sobre el colapso del mundo helenístico, las limitaciones estructurales del poder en un momento de cambio histórico y la dimensión trágica de su historia.',          'Inicio')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(sort_order, is_cover, image_url, alt, caption, credit, source_url) AS (
        VALUES
          (0, true,  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleopatra-VII.-Altes-Museum-Berlin1.jpg/800px-Kleopatra-VII.-Altes-Museum-Berlin1.jpg',          'Busto de Cleopatra VII en el Altes Museum de Berlín',         'Busto de mármol identificado como Cleopatra VII, conservado en el Altes Museum de Berlín. Es uno de los pocos retratos escultóricos que los historiadores vinculan con razonable certeza a la reina. A diferencia de las representaciones románticas posteriores, muestra a una mujer de rasgos enérgicos y expresión segura, coherente con las descripciones de su carácter que han llegado hasta nosotros.',                                                                                                         'Louis le Grand, 2006. CC BY-SA 2.5. Wikimedia Commons.',      'https://commons.wikimedia.org/wiki/File:Kleopatra-VII.-Altes-Museum-Berlin1.jpg'),
          (1, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Cleopatra_and_Caesar_by_Jean-Leon-Gerome.jpg/1280px-Cleopatra_and_Caesar_by_Jean-Leon-Gerome.jpg','Pintura de Cleopatra y César de Jean-Léon Gérôme',           'Cleopatra ante César, óleo de Jean-Léon Gérôme (1866). La pintura representa el célebre episodio en el que Cleopatra fue introducida clandestinamente en el palacio real de Alejandría, oculta en una alfombra según la tradición histórica. Aunque romanticizada, la escena captura el momento político decisivo en que Cleopatra apostó su destino a la alianza con Roma.',                                                                                                                                   'Jean-Léon Gérôme, 1866. Dominio público. Wikimedia Commons.', 'https://commons.wikimedia.org/wiki/File:Cleopatra_and_Caesar_by_Jean-Leon-Gerome.jpg'),
          (2, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Dendera_Cleopatra.jpg/800px-Dendera_Cleopatra.jpg',                                              'Relieve de Cleopatra VII en el templo de Dendera, Egipto',   'Relieve de Cleopatra VII en el templo de Hathor en Dendera, donde aparece representada como faraona en el estilo egipcio tradicional. Esta imagen es significativa: muestra a Cleopatra no como reina griega sino adoptando la iconografía sagrada del Egipto faraónico, coherente con su estrategia de legitimación ante el pueblo egipcio. Es una de las pocas representaciones contemporáneas a su reinado.',                                                                                                      'Dominio público. Wikimedia Commons.',                         'https://commons.wikimedia.org/wiki/File:Dendera_Cleopatra.jpg'),
          (3, false, 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Alexandria_ancient_map.jpg/1280px-Alexandria_ancient_map.jpg',                                  'Mapa histórico de la antigua Alejandría',                    'Reconstrucción cartográfica de la antigua Alejandría en la época ptolemaica. La ciudad era el centro intelectual y comercial del mundo mediterráneo: sede de la Gran Biblioteca, el Faro y el Museo. En este entorno cosmopolita creció Cleopatra, ciudad que moldeó su cosmopolitismo, su dominio de lenguas y su concepción del poder como síntesis de culturas.',                                                                                                                                              'Dominio público. Wikimedia Commons.',                         'https://commons.wikimedia.org/wiki/File:Alexandria_ancient_map.jpg')
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
        SELECT id FROM public.app_character WHERE name = 'Cleopatra VII'
      ),
      seed_data(block_key, title, body, page_key, sort_order) AS (
        VALUES
          ('overview_intro',    'Sobre Cleopatra VII',           'Cleopatra VII ha sido durante siglos más mito que persona: la seductora que perdió un imperio por amor. La historia real es más interesante y más compleja. Fue una gobernante que heredó un reino en declive y lo mantuvo soberano durante dos décadas mediante una combinación de inteligencia diplomática, conocimiento de idiomas y voluntad política extraordinaria. Entender a Cleopatra es entender cómo se ejerce el poder cuando las cartas no están a tu favor.',                                                                                                                                                                                                                      'overview',     0),
          ('voice_description', 'Su voz y manera de conversar', 'Cleopatra habla desde la autoridad de quien ha gobernado de verdad y ha perdido de verdad. No se disculpa por sus decisiones ni las romantiza: las evalúa desde la lógica del poder y la supervivencia de Egipto. Su inteligencia es estratégica y su memoria, política. Si le preguntas sobre César o Marco Antonio, te responderá en términos de alianzas y consecuencias, no solo de afecto. Y si la presionas con preguntas incómodas, las aceptará: está acostumbrada a ellas.', 'conversation', 0)
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
      WHERE eb.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_gallery_image gi
      USING public.app_character c
      WHERE gi.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_prompt p
      USING public.app_character c
      WHERE p.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_relationship tr
      USING public.app_character_timeline_entry te, public.app_character c
      WHERE tr.timeline_entry_id = te.id
        AND te.character_id = c.id
        AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_relationship r
      USING public.app_character c
      WHERE r.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_timeline_entry te
      USING public.app_character c
      WHERE te.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_context_card cc
      USING public.app_character c
      WHERE cc.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_fact f
      USING public.app_character c
      WHERE f.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character_quote q
      USING public.app_character c
      WHERE q.character_id = c.id AND c.name = 'Cleopatra VII'
    `);

    await queryRunner.query(`
      DELETE FROM public.app_character WHERE name = 'Cleopatra VII'
    `);
  }
}
