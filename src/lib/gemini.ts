import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function parseEmailRequirement(emailContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract lead information from the following email content. Return JSON.
    Email: ${emailContent}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          customerName: { type: Type.STRING },
          contactPerson: { type: Type.STRING },
          requirementText: { type: Type.STRING },
          email: { type: Type.STRING },
          estimatedValue: { type: Type.NUMBER },
          productType: { type: Type.STRING }
        },
        required: ["customerName", "contactPerson", "requirementText", "email"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
