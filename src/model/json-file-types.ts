import * as z from "zod";

export const EndToEndJsonFile = z.object({
    participants: z.array(z.string()),
    threadName: z.string(),
    messages: z.array(z.object({
        isUnsent: z.boolean(),
        media: z.array(z.object({
            uri: z.string()
        })),
        reactions: z.array(z.object({
            actor: z.string(),
            reaction: z.string()
        })),
        senderName: z.string(),
        text: z.string(),
        "timestamp": z.number(),
        type: z.enum(["media", "text", "link", "placeholder"])
    }))
});