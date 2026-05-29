import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({
  image_url: z.string().url().max(2000),
});

export const analisarTemplate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const KEY = process.env.LOVABLE_API_KEY;
    if (!KEY) return { ok: false as const, error: "LOVABLE_API_KEY ausente" };

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "És um designer especialista em convites. Analisa a imagem e devolve sugestão de design.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Analisa este template de convite e extrai paleta de cores, tipografia e estilo. Devolve via tool call.",
                },
                { type: "image_url", image_url: { url: data.image_url } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "design_extraido",
                description: "Sugestão de design extraída do template",
                parameters: {
                  type: "object",
                  properties: {
                    bg: {
                      type: "string",
                      description: "Cor de fundo dominante em hex (#rrggbb)",
                    },
                    accent: {
                      type: "string",
                      description: "Cor de destaque em hex (#rrggbb)",
                    },
                    fonte: {
                      type: "string",
                      enum: [
                        "Playfair Display",
                        "Cormorant Garamond",
                        "Inter",
                        "Bebas Neue",
                      ],
                    },
                    textura: { type: "string", enum: ["liso", "ondas", "brilho"] },
                    estilo: {
                      type: "string",
                      description: "Descrição curta do estilo visual",
                    },
                  },
                  required: ["bg", "accent", "fonte", "textura", "estilo"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "design_extraido" } },
        }),
      });

      if (res.status === 429)
        return { ok: false as const, error: "Limite de IA atingido, tente mais tarde" };
      if (res.status === 402)
        return { ok: false as const, error: "Créditos de IA esgotados" };
      if (!res.ok)
        return { ok: false as const, error: `Falha IA (${res.status})` };

      const json = (await res.json()) as {
        choices?: Array<{
          message?: {
            tool_calls?: Array<{ function?: { arguments?: string } }>;
          };
        }>;
      };
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { ok: false as const, error: "Resposta IA inválida" };
      const parsed = JSON.parse(args) as {
        bg: string;
        accent: string;
        fonte: string;
        textura: "liso" | "ondas" | "brilho";
        estilo: string;
      };
      return { ok: true as const, design: parsed };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      };
    }
  });
