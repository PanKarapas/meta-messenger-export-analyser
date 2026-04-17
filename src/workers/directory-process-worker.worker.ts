/// <reference lib="webworker" />

import zod from "zod";
import { EndToEndJsonFile } from "../model/json-file-types";
import { ConversationParticipantStats, ConversationStats, CountByDayAndTime, GlobalStats, IndividualCount, MessageStats } from "../model/message-stats";
import { Directory, isDirectory } from "../utils/file-list-to-directory";
import { addIndividualCounts } from "../utils/individual-counts-utils";
export type WorkerIncoming = Directory;
export type WorkerOutgoing = { type: "Progress", progress: number } | { type: "Done", result: MessageStats }

const DAY_INDEX_MONDAY_START = [6, 0, 1, 2, 3, 4, 5] as const;

addEventListener('message', ({ data }) => {
  const dataTyped = data as Directory;
  processEndToEndFiles(dataTyped, (progress) => {
    postMessage({ type: "Progress", progress } as WorkerOutgoing);
  }).then((result) => {
    postMessage({ type: "Done", result } as WorkerOutgoing);
  })
});


const DefaultConversationParticipantStats: ConversationParticipantStats = {
  textMessages: {
    count: 0,
    countByDayAndTime: Array.from({length: 7}, () => new Array(24).fill(0)) as CountByDayAndTime,
    totalLength: 0,
    wordCount: new Map()
  },
  reactions: {
    totalCount: 0,
    individualCount: new Map()
  },
  linkMessages: {
    count: 0,
    countByDayAndTime: Array.from({length: 7}, () => new Array(24).fill(0)) as CountByDayAndTime,
  },
  mediaCount: 0
};


export async function processEndToEndFiles(directory: Directory, updateProgress: (progress: number) => void): Promise<MessageStats> {
  const result: MessageStats = {
    global: {},
    conversation: {}
  };
  let counter = 0;
  for (const file of directory.children) {
    try {
      // Skip nested directories
      if (isDirectory(file)) {
        continue;
      }

      // parse JSON, skip any that fail to parse
      let obj: unknown;
      try {
        obj = JSON.parse(await file.text());
      } catch {
        continue;
      }

      const parsed = EndToEndJsonFile.safeParse(obj);
      if (parsed.success) {
        result.conversation[parsed.data.threadName] =
          await processEndToEndConversation(parsed.data,
            // convert conversation progress to total progress
            (conversationProgress) => {
              updateProgress(((conversationProgress + counter) / directory.children.length));
            }
          );
        addConversationStatsToGlobalStats(result.global, result.conversation[parsed.data.threadName]);
      } else {
        // TODO: log error?
        continue;
      }
    } finally {
      updateProgress((++counter / directory.children.length));
    }
  }

  return result;
}

async function processEndToEndConversation(conversation: zod.infer<typeof EndToEndJsonFile>, updateProgress: (progress: number) => void): Promise<ConversationStats> {
  const result: ConversationStats = {
    participants: conversation.participants,
    participantStats: {}
  };
  let counter = 0;
  for (const message of conversation.messages) {
    const date = new Date(message.timestamp);
    if (!result.participantStats[message.senderName]) {
      result.participantStats[message.senderName] = structuredClone(DefaultConversationParticipantStats);
    }

    switch (message.type) {
      case "text":
        result.participantStats[message.senderName].textMessages.count += 1;
        result.participantStats[message.senderName].textMessages.countByDayAndTime[DAY_INDEX_MONDAY_START[date.getDay()]][date.getHours()] += 1;
        result.participantStats[message.senderName].textMessages.totalLength += message.text.length;
        result.participantStats[message.senderName].textMessages.wordCount =
          addIndividualCounts(
            result.participantStats[message.senderName].textMessages.wordCount,
            countWords(message.text)
          );
        break;
      case "link":
        result.participantStats[message.senderName].linkMessages.count += 1;
        result.participantStats[message.senderName].linkMessages.countByDayAndTime[DAY_INDEX_MONDAY_START[date.getDay()]][date.getHours()] += 1;
        break;
      case "media":
        result.participantStats[message.senderName].mediaCount += 1;
        break;
      case "placeholder":
        // TODO: count deleted? Probably not accurate
        break;
    }

    for (const reaction of message.reactions) {
      if (!result.participantStats[reaction.actor]) {
        result.participantStats[reaction.actor] = structuredClone(DefaultConversationParticipantStats);
      }

      result.participantStats[reaction.actor].reactions.totalCount += 1;
      result.participantStats[reaction.actor].reactions.individualCount.set(reaction.reaction,
        (result.participantStats[reaction.actor].reactions.individualCount.get(reaction.reaction) ?? 0) + 1);
    }
    counter++;
    if (counter % 500 === 0) {
      updateProgress(counter / conversation.messages.length);
    }
  }

  return result;
}

function addConversationStatsToGlobalStats(globalStats: GlobalStats, conversationStats: ConversationStats) {
  for (const participant of conversationStats.participants) {
    if (!globalStats[participant]) {
      globalStats[participant] = {
        ...structuredClone(DefaultConversationParticipantStats),
        numberOfConversations: 0
      }
    }

    globalStats[participant].numberOfConversations += 1;

    if (conversationStats.participantStats[participant]) {
      const globalParticipantStats = globalStats[participant];
      const convParticipantStats = conversationStats.participantStats[participant];
      globalStats[participant].textMessages = {
        count: globalParticipantStats.textMessages.count + (convParticipantStats.textMessages.count ?? 0),
        countByDayAndTime: globalParticipantStats.textMessages.countByDayAndTime.map((val, i) => val.map((val2, j) => val2 + (convParticipantStats.textMessages.countByDayAndTime[i][j] ?? 0))) as CountByDayAndTime,
        totalLength: globalParticipantStats.textMessages.totalLength + (convParticipantStats.textMessages.totalLength ?? 0),
        wordCount: addIndividualCounts(globalParticipantStats.textMessages.wordCount, convParticipantStats.textMessages.wordCount)
      };
      globalStats[participant].reactions = {
        totalCount: globalParticipantStats.reactions.totalCount + (convParticipantStats.reactions.totalCount ?? 0),
        individualCount: addIndividualCounts(globalParticipantStats.reactions.individualCount, convParticipantStats.reactions.individualCount)
      };
      globalStats[participant].mediaCount += convParticipantStats.mediaCount ?? 0;
      globalStats[participant].linkMessages = {
        count: globalParticipantStats.linkMessages.count + (convParticipantStats.linkMessages.count ?? 0),
        countByDayAndTime: globalParticipantStats.linkMessages.countByDayAndTime.map((val, i) => val.map((val2, j) => val2 + (convParticipantStats.linkMessages.countByDayAndTime[i][j] ?? 0))) as CountByDayAndTime,
      };
    }
  }
}

function countWords(text: string): IndividualCount {
  const split =
    text.toLocaleLowerCase()
      .split(/\s+/)
      .map(x => x.replaceAll(/(^[\p{P}\p{S}]+|[\p{P}\p{S}]+$)/gu, ""))
      .filter(x => x.length > 0)
      .filter(x => !/\d+/.test(x))
      .filter(x => !x.startsWith('http') && !x.includes('www.'));

  const result: IndividualCount = new Map<string, number>();
  split.forEach(key => {
    result.set(key, (result.get(key) ?? 0) + 1)
  });
  return result;
}