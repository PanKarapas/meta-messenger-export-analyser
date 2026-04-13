// 0-1, 1-2, 2-3, ..., 23-24
export type CountTimeOfDay = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

// Monday, Tuesday, ..., Sunday
export type CountByDayAndTime = [CountTimeOfDay, CountTimeOfDay, CountTimeOfDay, CountTimeOfDay, CountTimeOfDay, CountTimeOfDay, CountTimeOfDay];

export interface MessageStats {
    global: GlobalStats,
    conversation: { [conversationId: string]: ConversationStats },
}


export interface GlobalStats {
    [participant: string]: GlobalParticipantStats
}

export interface GlobalParticipantStats extends ConversationParticipantStats {
     numberOfConversations: number,
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
        countByDayAndTime: CountByDayAndTime,
        totalLength: number,
        wordCount: IndividualCount
    }
    reactions: {
        totalCount: number,
        individualCount: IndividualCount
    },
    linkMessages: {
        count: number,
        countByDayAndTime: CountByDayAndTime,
    },
    mediaCount: number,
}

export type IndividualCount = Map<string, number>;