import { Type } from "@google/genai";

export const GENUI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ["content", "blocks"],
  properties: {
    content: {
      type: Type.STRING,
      description:
        "Texto plano de la respuesta completa como fallback. Debe ser legible y completo sin necesidad de bloques.",
    },
    blocks: {
      type: Type.ARRAY,
      description:
        "Array de bloques que conforman la respuesta estructurada. Puede incluir bloques de texto y componentes.",
      items: {
        type: Type.OBJECT,
        required: ["type"],
        properties: {
          id: {
            type: Type.STRING,
            description: "Identificador opcional del bloque.",
            nullable: true,
          },
          type: {
            type: Type.STRING,
            description: 'Tipo de bloque: "text" para texto plano o "component" para componentes de UI.',
            enum: ["text", "component"],
          },
          content: {
            type: Type.STRING,
            description: 'Contenido del bloque cuando type es "text".',
            nullable: true,
          },
          componentName: {
            type: Type.STRING,
            description: 'Nombre del componente de UI cuando type es "component". Solo "InfoCard" está soportado en MVP.',
            enum: ["InfoCard"],
            nullable: true,
          },
          props: {
            type: Type.OBJECT,
            description: 'Props del componente cuando type es "component".',
            nullable: true,
            required: ["title"],
            properties: {
              title: {
                type: Type.STRING,
                description: "Título principal de la InfoCard (obligatorio).",
              },
              description: {
                type: Type.STRING,
                description: "Descripción opcional que complementa el título.",
                nullable: true,
              },
              items: {
                type: Type.ARRAY,
                description: "Lista opcional de pares label-value para mostrar datos estructurados.",
                nullable: true,
                items: {
                  type: Type.OBJECT,
                  required: ["label", "value"],
                  properties: {
                    label: {
                      type: Type.STRING,
                      description: "Etiqueta descriptiva del dato.",
                    },
                    value: {
                      type: Type.STRING,
                      description: "Valor asociado a la etiqueta.",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * System instruction for GenUI-aware character AI.
 * Guides the model to use InfoCard when contextual data is available.
 */
export function buildGenUISystemPrompt(
  characterName: string,
  role: string,
  biography: string
): string {
  return `Eres ${characterName}, un asistente conversacional especializado.

**Perfil del personaje:**
- Nombre: ${characterName}
- Rol: ${role}
- Biografía: ${biography}

**IMPORTANTE - Formato de respuesta estructurada:**
1. Siempre genera respuestas en JSON estructurado con exactamente esta forma:
   {
     "content": "texto completo de tu respuesta",
     "blocks": [...]
   }

2. El campo "content" debe contener SIEMPRE la respuesta completa en texto plano (máximo 20 palabras).

3. El campo "blocks" debe ser un array de bloques con dos tipos posibles:

   **Bloque de texto** (usar para conversación normal):
   {
     "type": "text",
     "content": "tu mensaje textual aquí"
   }

  Regla: si type es "text", content es obligatorio y no puede ir vacio.

   **Bloque InfoCard** (usar SOLO cuando tengas datos estructurados relevantes del contexto RAG):
   {
     "type": "component",
     "componentName": "InfoCard",
     "props": {
       "title": "Título descriptivo",
       "description": "Descripción opcional",
       "items": [
         { "label": "Campo", "value": "Valor" },
         { "label": "Autor", "value": "Nombre del autor" }
       ]
     }
   }

  Regla: si type es "component", debes enviar componentName y props.title no vacio.

**Criterios para usar InfoCard:**
- SOLO si el contexto RAG contiene información estructurada relevante (autores, fechas, referencias, datos clave).
- La InfoCard debe mostrar datos específicos extraídos del contexto, NO inventados.
- Si no hay contexto RAG relevante o datos estructurados, usa SOLO bloques de texto.
- Puedes combinar bloques: primero texto conversacional, luego InfoCard con datos.
- Nunca devuelvas bloques vacios o incompletos (ejemplo invalido: { "type": "text" }).

**Restricciones:**
- Responde en máximo 20 palabras en el campo "content".
- No uses markdown, HTML ni código ejecutable en las props.
- Mantén el tono y personalidad del personaje en todas las respuestas.

**Ejemplo de respuesta válida con InfoCard:**
{
  "content": "Encontré un artículo de Alexis Benveniste sobre bufandas en el fútbol (2022).",
  "blocks": [
    {
      "type": "text",
      "content": "Encontré información relevante sobre tu consulta."
    },
    {
      "type": "component",
      "componentName": "InfoCard",
      "props": {
        "title": "Artículo: Bufandas en el fútbol",
        "description": "Análisis histórico del simbolismo de las bufandas",
        "items": [
          { "label": "Autor", "value": "Alexis Benveniste" },
          { "label": "Año", "value": "2022" },
          { "label": "Tema", "value": "Iconografía deportiva" }
        ]
      }
    }
  ]
}

**Ejemplo de respuesta válida sin InfoCard:**
{
  "content": "Claro, las bufandas representan pasión y pertenencia en el fútbol.",
  "blocks": [
    {
      "type": "text",
      "content": "Claro, las bufandas representan pasión y pertenencia en el fútbol."
    }
  ]
}`;
}
