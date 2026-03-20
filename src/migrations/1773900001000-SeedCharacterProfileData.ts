import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCharacterProfileData1773900001000 implements MigrationInterface {
  name = "SeedCharacterProfileData1773900001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      WITH seed_data AS (
        SELECT *
        FROM (
          VALUES
            (
              'Albert Einstein'::text,
              'Fisico teorico'::text,
              'Cientifico que transformo nuestra comprension del espacio, el tiempo y la energia.'::text,
              'Conversa sobre relatividad, ciencia y etica con un tono reflexivo y claro.'::text,
              'einstein'::text,
              'einstein_kb'::text,
              'oklch(0.35 0.08 200)'::text,
              'oklch(0.92 0.03 200)'::text,
              '1879 - 1955'::text,
              'Ciencia'::text,
              'Siglo XX'::text,
              'La imaginacion es mas importante que el conocimiento.'::text,
              '/characters/einstein.jpg'::text,
              'popular'::text,
              '["Relatividad especial", "Relatividad general", "Fisica cuantica", "Etica cientifica"]'::jsonb
            ),
            (
              'Cleopatra VII'::text,
              'Reina de Egipto'::text,
              'Gobernante estratega del Egipto ptolemaico y figura central del Mediterraneo antiguo.'::text,
              'Habla de politica, diplomacia y cultura helenistica con enfoque historico.'::text,
              'cleopatra'::text,
              'cleopatra_kb'::text,
              'oklch(0.50 0.15 50)'::text,
              'oklch(0.92 0.05 50)'::text,
              '69 a.C. - 30 a.C.'::text,
              'Historia'::text,
              'Antiguedad'::text,
              'Defendere mi reino con inteligencia y determinacion.'::text,
              '/characters/cleopatra.jpg'::text,
              'popular'::text,
              '["Egipto ptolemaico", "Roma y Egipto", "Diplomacia", "Poder en la Antiguedad"]'::jsonb
            ),
            (
              'Charles Darwin'::text,
              'Naturalista'::text,
              'Naturalista britanico que desarrollo la teoria de la evolucion por seleccion natural.'::text,
              'Responde sobre evolucion, biodiversidad y metodo cientifico.'::text,
              'darwin'::text,
              'darwin_kb'::text,
              'oklch(0.40 0.10 145)'::text,
              'oklch(0.92 0.04 145)'::text,
              '1809 - 1882'::text,
              'Ciencia'::text,
              'Siglo XIX'::text,
              'No es la especie mas fuerte la que sobrevive, sino la que mejor se adapta.'::text,
              '/characters/darwin.jpg'::text,
              NULL::text,
              '["Evolucion", "Seleccion natural", "Viaje del Beagle", "Historia natural"]'::jsonb
            ),
            (
              'Sherlock Holmes'::text,
              'Detective consultor'::text,
              'Detective ficticio famoso por su observacion y razonamiento deductivo.'::text,
              'Analiza pistas y casos con precision logica y estilo literario.'::text,
              'sherlock'::text,
              'sherlock_kb'::text,
              'oklch(0.30 0.02 250)'::text,
              'oklch(0.91 0.01 250)'::text,
              'Personaje literario'::text,
              'Ficcion'::text,
              'Ficticio'::text,
              'Cuando se ha eliminado lo imposible, lo que queda, por improbable que parezca, debe ser la verdad.'::text,
              '/characters/sherlock.jpg'::text,
              'popular'::text,
              '["Deduccion", "Casos criminales", "Londres victoriano", "Metodos de investigacion"]'::jsonb
            ),
            (
              'Isaac Newton'::text,
              'Fisico y matematico'::text,
              'Cientifico clave de la revolucion cientifica, autor de leyes del movimiento y gravitation.'::text,
              'Explica mecanica clasica, optica y calculo con rigor.'::text,
              'newton'::text,
              'newton_kb'::text,
              'oklch(0.35 0.05 280)'::text,
              'oklch(0.91 0.02 280)'::text,
              '1643 - 1727'::text,
              'Ciencia'::text,
              'Siglo XVII'::text,
              'Si he visto mas lejos es porque estoy sentado sobre hombros de gigantes.'::text,
              '/characters/newton.jpg'::text,
              NULL::text,
              '["Leyes del movimiento", "Gravitacion universal", "Optica", "Historia de la ciencia"]'::jsonb
            ),
            (
              'Frida Kahlo'::text,
              'Pintora'::text,
              'Artista mexicana reconocida por su obra autobiografica y simbolismo identitario.'::text,
              'Conversa sobre arte, identidad, dolor y expresion cultural.'::text,
              'frida'::text,
              'frida_kb'::text,
              'oklch(0.50 0.18 25)'::text,
              'oklch(0.93 0.05 25)'::text,
              '1907 - 1954'::text,
              'Arte'::text,
              'Siglo XX'::text,
              'Pies, para que los quiero si tengo alas para volar.'::text,
              '/characters/frida.jpg'::text,
              'new'::text,
              '["Arte mexicano", "Autorretrato", "Identidad", "Surrealismo"]'::jsonb
            ),
            (
              'Sócrates'::text,
              'Filosofo'::text,
              'Filosofo ateniense considerado fundador de la etica occidental.'::text,
              'Dialoga con preguntas para profundizar en ideas y argumentos.'::text,
              'socrates'::text,
              'socrates_kb'::text,
              'oklch(0.45 0.08 85)'::text,
              'oklch(0.93 0.03 85)'::text,
              '470 a.C. - 399 a.C.'::text,
              'Filosofia'::text,
              'Antiguedad'::text,
              'Solo se que no se nada.'::text,
              '/characters/socrates.jpg'::text,
              NULL::text,
              '["Dialogo socratico", "Etica", "Conocimiento", "Mayeutica"]'::jsonb
            ),
            (
              'Marie Curie'::text,
              'Fisica y quimica'::text,
              'Pionera en el estudio de la radioactividad y primera persona con dos Nobel cientificos.'::text,
              'Responde sobre ciencia experimental, perseverancia y descubrimiento.'::text,
              'curie'::text,
              'curie_kb'::text,
              'oklch(0.45 0.12 180)'::text,
              'oklch(0.92 0.04 180)'::text,
              '1867 - 1934'::text,
              'Ciencia'::text,
              'Siglo XX'::text,
              'Nada en la vida debe ser temido, solamente comprendido.'::text,
              '/characters/curie.jpg'::text,
              'new'::text,
              '["Radioactividad", "Metodo cientifico", "Mujeres en ciencia", "Historia de la quimica"]'::jsonb
            ),
            (
              'Leonardo da Vinci'::text,
              'Artista e inventor'::text,
              'Polimata renacentista que integro arte, ingenieria y observacion cientifica.'::text,
              'Comparte ideas sobre creatividad, anatomia, pintura e invencion.'::text,
              'davinci'::text,
              'davinci_kb'::text,
              'oklch(0.40 0.08 60)'::text,
              'oklch(0.93 0.03 60)'::text,
              '1452 - 1519'::text,
              'Arte'::text,
              'Renacimiento'::text,
              'La simplicidad es la maxima sofisticacion.'::text,
              '/characters/davinci.jpg'::text,
              NULL::text,
              '["Renacimiento", "Anatomia", "Pintura", "Ingenieria"]'::jsonb
            )
        ) AS v(
          name,
          role,
          biography,
          description,
          image_slug,
          vector_db_name,
          theme_color,
          theme_color_light,
          years,
          category,
          epoch,
          quote,
          image_url,
          badge,
          topics
        )
      )
      UPDATE public.app_character c
      SET
        role = s.role,
        biography = s.biography,
        description = s.description,
        vector_db_name = s.vector_db_name,
        theme_color = s.theme_color,
        theme_color_light = s.theme_color_light,
        years = s.years,
        category = s.category,
        epoch = s.epoch,
        quote = s.quote,
        image_url = s.image_url,
        badge = s.badge,
        topics = s.topics,
        is_public = true
      FROM seed_data s
      WHERE c.name = s.name;
    `);

    await queryRunner.query(`
      WITH seed_data AS (
        SELECT *
        FROM (
          VALUES
            (
              'Albert Einstein'::text,
              'Fisico teorico'::text,
              'Cientifico que transformo nuestra comprension del espacio, el tiempo y la energia.'::text,
              'Conversa sobre relatividad, ciencia y etica con un tono reflexivo y claro.'::text,
              'einstein_kb'::text,
              'oklch(0.35 0.08 200)'::text,
              'oklch(0.92 0.03 200)'::text,
              '1879 - 1955'::text,
              'Ciencia'::text,
              'Siglo XX'::text,
              'La imaginacion es mas importante que el conocimiento.'::text,
              '/characters/einstein.jpg'::text,
              'popular'::text,
              '["Relatividad especial", "Relatividad general", "Fisica cuantica", "Etica cientifica"]'::jsonb
            ),
            (
              'Cleopatra VII'::text,
              'Reina de Egipto'::text,
              'Gobernante estratega del Egipto ptolemaico y figura central del Mediterraneo antiguo.'::text,
              'Habla de politica, diplomacia y cultura helenistica con enfoque historico.'::text,
              'cleopatra_kb'::text,
              'oklch(0.50 0.15 50)'::text,
              'oklch(0.92 0.05 50)'::text,
              '69 a.C. - 30 a.C.'::text,
              'Historia'::text,
              'Antiguedad'::text,
              'Defendere mi reino con inteligencia y determinacion.'::text,
              '/characters/cleopatra.jpg'::text,
              'popular'::text,
              '["Egipto ptolemaico", "Roma y Egipto", "Diplomacia", "Poder en la Antiguedad"]'::jsonb
            ),
            (
              'Charles Darwin'::text,
              'Naturalista'::text,
              'Naturalista britanico que desarrollo la teoria de la evolucion por seleccion natural.'::text,
              'Responde sobre evolucion, biodiversidad y metodo cientifico.'::text,
              'darwin_kb'::text,
              'oklch(0.40 0.10 145)'::text,
              'oklch(0.92 0.04 145)'::text,
              '1809 - 1882'::text,
              'Ciencia'::text,
              'Siglo XIX'::text,
              'No es la especie mas fuerte la que sobrevive, sino la que mejor se adapta.'::text,
              '/characters/darwin.jpg'::text,
              NULL::text,
              '["Evolucion", "Seleccion natural", "Viaje del Beagle", "Historia natural"]'::jsonb
            ),
            (
              'Sherlock Holmes'::text,
              'Detective consultor'::text,
              'Detective ficticio famoso por su observacion y razonamiento deductivo.'::text,
              'Analiza pistas y casos con precision logica y estilo literario.'::text,
              'sherlock_kb'::text,
              'oklch(0.30 0.02 250)'::text,
              'oklch(0.91 0.01 250)'::text,
              'Personaje literario'::text,
              'Ficcion'::text,
              'Ficticio'::text,
              'Cuando se ha eliminado lo imposible, lo que queda, por improbable que parezca, debe ser la verdad.'::text,
              '/characters/sherlock.jpg'::text,
              'popular'::text,
              '["Deduccion", "Casos criminales", "Londres victoriano", "Metodos de investigacion"]'::jsonb
            ),
            (
              'Isaac Newton'::text,
              'Fisico y matematico'::text,
              'Cientifico clave de la revolucion cientifica, autor de leyes del movimiento y gravitation.'::text,
              'Explica mecanica clasica, optica y calculo con rigor.'::text,
              'newton_kb'::text,
              'oklch(0.35 0.05 280)'::text,
              'oklch(0.91 0.02 280)'::text,
              '1643 - 1727'::text,
              'Ciencia'::text,
              'Siglo XVII'::text,
              'Si he visto mas lejos es porque estoy sentado sobre hombros de gigantes.'::text,
              '/characters/newton.jpg'::text,
              NULL::text,
              '["Leyes del movimiento", "Gravitacion universal", "Optica", "Historia de la ciencia"]'::jsonb
            ),
            (
              'Frida Kahlo'::text,
              'Pintora'::text,
              'Artista mexicana reconocida por su obra autobiografica y simbolismo identitario.'::text,
              'Conversa sobre arte, identidad, dolor y expresion cultural.'::text,
              'frida_kb'::text,
              'oklch(0.50 0.18 25)'::text,
              'oklch(0.93 0.05 25)'::text,
              '1907 - 1954'::text,
              'Arte'::text,
              'Siglo XX'::text,
              'Pies, para que los quiero si tengo alas para volar.'::text,
              '/characters/frida.jpg'::text,
              'new'::text,
              '["Arte mexicano", "Autorretrato", "Identidad", "Surrealismo"]'::jsonb
            ),
            (
              'Sócrates'::text,
              'Filosofo'::text,
              'Filosofo ateniense considerado fundador de la etica occidental.'::text,
              'Dialoga con preguntas para profundizar en ideas y argumentos.'::text,
              'socrates_kb'::text,
              'oklch(0.45 0.08 85)'::text,
              'oklch(0.93 0.03 85)'::text,
              '470 a.C. - 399 a.C.'::text,
              'Filosofia'::text,
              'Antiguedad'::text,
              'Solo se que no se nada.'::text,
              '/characters/socrates.jpg'::text,
              NULL::text,
              '["Dialogo socratico", "Etica", "Conocimiento", "Mayeutica"]'::jsonb
            ),
            (
              'Marie Curie'::text,
              'Fisica y quimica'::text,
              'Pionera en el estudio de la radioactividad y primera persona con dos Nobel cientificos.'::text,
              'Responde sobre ciencia experimental, perseverancia y descubrimiento.'::text,
              'curie_kb'::text,
              'oklch(0.45 0.12 180)'::text,
              'oklch(0.92 0.04 180)'::text,
              '1867 - 1934'::text,
              'Ciencia'::text,
              'Siglo XX'::text,
              'Nada en la vida debe ser temido, solamente comprendido.'::text,
              '/characters/curie.jpg'::text,
              'new'::text,
              '["Radioactividad", "Metodo cientifico", "Mujeres en ciencia", "Historia de la quimica"]'::jsonb
            ),
            (
              'Leonardo da Vinci'::text,
              'Artista e inventor'::text,
              'Polimata renacentista que integro arte, ingenieria y observacion cientifica.'::text,
              'Comparte ideas sobre creatividad, anatomia, pintura e invencion.'::text,
              'davinci_kb'::text,
              'oklch(0.40 0.08 60)'::text,
              'oklch(0.93 0.03 60)'::text,
              '1452 - 1519'::text,
              'Arte'::text,
              'Renacimiento'::text,
              'La simplicidad es la maxima sofisticacion.'::text,
              '/characters/davinci.jpg'::text,
              NULL::text,
              '["Renacimiento", "Anatomia", "Pintura", "Ingenieria"]'::jsonb
            )
        ) AS v(
          name,
          role,
          biography,
          description,
          vector_db_name,
          theme_color,
          theme_color_light,
          years,
          category,
          epoch,
          quote,
          image_url,
          badge,
          topics
        )
      )
      INSERT INTO public.app_character (
        id,
        name,
        role,
        biography,
        key_traits,
        speech_tics,
        description,
        vector_db_name,
        is_public,
        theme_color,
        theme_color_light,
        years,
        category,
        epoch,
        quote,
        image_url,
        badge,
        topics
      )
      SELECT
        uuid_generate_v4(),
        s.name,
        s.role,
        s.biography,
        '[]'::jsonb,
        '[]'::jsonb,
        s.description,
        s.vector_db_name,
        true,
        s.theme_color,
        s.theme_color_light,
        s.years,
        s.category,
        s.epoch,
        s.quote,
        s.image_url,
        s.badge,
        s.topics
      FROM seed_data s
      WHERE NOT EXISTS (
        SELECT 1 FROM public.app_character c WHERE c.name = s.name
      );
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intencionalmente no-op: no borramos contenido de catalogo en rollback.
  }
}