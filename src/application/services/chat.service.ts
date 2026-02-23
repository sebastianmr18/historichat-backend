import { AppDataSource } from "../../config/database.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { GeminiService } from "../../infrastructure/ai/gemini.service.js";
import { ITextToSpeech, ISpeechToText } from "../../shared/types.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";

export class ChatService {
  private characterRepo = AppDataSource.getRepository(Character);
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private messageRepo = AppDataSource.getRepository(Message);

  constructor(
    private gemini: GeminiService,
    private voice: ITextToSpeech & ISpeechToText,
    private vectorStore: ChromaRepository
  ) {}

  async processMessage(conversationId: string, userText: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: ["character"],
    });

    if (!conversation) throw new Error("Conversation not found");

    const history = await this.messageRepo.find({
      where: { conversationId },
      order: { timestamp: "ASC" },
      take: 6,
    });

    const context = await this.vectorStore.getContext(
      userText,
      conversation.character.vectorDbName || "default"
    );

    const systemPrompt = `Actúa como ${conversation.character.name}. Rol: ${conversation.character.role}. Bio: ${conversation.character.biography}`;
    console.log(systemPrompt)
    console.log(history)
    console.log(context)
    console.log(userText)

    const aiResponseText = await this.gemini.generateResponse(
      systemPrompt,
      history as any,
      userText,
      context
    );

    await AppDataSource.transaction(async (manager) => {
      await manager.save(Message, { conversationId, role: "user", content: userText });
      await manager.save(Message, { conversationId, role: "assistant", content: aiResponseText });
    });

    const audioBuffer = await this.voice.synthesize(aiResponseText, conversation.character.voiceId);

    return {
      text: aiResponseText,
      audioBase64: audioBuffer.toString("base64"),
    };
  }
}