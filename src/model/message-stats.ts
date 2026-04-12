// 0-1, 1-2, 2-3, ..., 23-24
export type CountTimeOfDay = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
// Sunday, Monday, ...
export type CountDayOfWeek = [number, number, number, number, number, number, number];

export interface MessageStats {
    global: GlobalStats,
    conversation: { [conversationId: string]: ConversationStats },
}


export interface GlobalStats {
    [participant: string]: {
        totalTextMessages: number,
        totalReactions: number,
        totalMedia: number,
        numberOfConversations: number,
        wordCount: IndividualCount
    }
}

export interface ConversationStats {
    participants: string[],
    participantStats: {
        [name: string]: ConversationParticipantStats
    }
}

export interface ConversationParticipantStats {
    textMessages: {
        count: number,
        countTimeOfDay: CountTimeOfDay,
        countDayOfWeek: CountDayOfWeek,
        totalLength: number,
        wordCount: IndividualCount
    }
    reactions: {
        totalCount: number,
        individualCount: IndividualCount
    },
    linkMessages: {
        count: number,
        countTimeOfDay: CountTimeOfDay,
        countDayOfWeek: CountDayOfWeek,
    },
    mediaCount: number,
}

export type IndividualCount = Map<string, number>;