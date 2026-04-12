/// <reference lib="webworker" />

import zod from "zod";
import { EndToEndJsonFile } from "../model/json-file-types";
import { ConversationParticipantStats, ConversationStats, CountDayOfWeek, CountTimeOfDay, GlobalStats, IndividualCount, MessageStats } from "../model/message-stats";
import { Directory, isDirectory } from "../utils/file-list-to-directory";
import { addIndividualCounts } from "../utils/individual-counts-utils";
export type WorkerIncoming = Directory;
export type WorkerOutgoing = { type: "Progress", progress: number } | { type: "Done", result: MessageStats }


addEventListener('message', ({ data }) => {
  const dataTyped = data as Directory;
  const result = processEndToEndFiles(dataTyped, (progress) => {
    postMessage({ type: "Progress", progress } as WorkerOutgoing);
  }).then((result) => {
    postMessage({ type: "Done", result } as WorkerOutgoing);
  })
});


const DefaultConversationParticipantStats: ConversationParticipantStats = {
  textMessages: {
    count: 0,
    countTimeOfDay: new Array(24).fill(0) as CountTimeOfDay,
    countDayOfWeek: new Array(7).fill(0) as CountDayOfWeek,
    totalLength: 0,
    wordCount: new Map()
  },
  reactions: {
    totalCount: 0,
    individualCount: new Map()
  },
  linkMessages: {
    count: 0,
    countTimeOfDay: new Array(24).fill(0) as CountTimeOfDay,
    countDayOfWeek: new Array(7).fill(0) as CountDayOfWeek,
  },
  mediaCount: 0
};


export async function processEndToEndFiles(directory: Directory, updateProgress: (progress: number) => void): Promise<MessageStats> {
  var result: MessageStats = {
    global: {},
    conversation: {}
  };
  var counter = 0;
  for (var file of directory.children) {
    try {
      // Skip nested directories
      if (isDirectory(file)) {
        continue;
      }

      // parse JSON, skip any that fail to parse
      var obj: any;
      try {
        obj = JSON.parse(await file.text());
      } catch {
        continue;
      }

      var parsed = EndToEndJsonFile.safeParse(obj);
      if (parsed.success) {
        result.conversation[parsed.data.threadName] =
          await processEndToEndConversation(parsed.data,
            // convert conversation progress to total progress
            (conversationProgress) => {
              updateProgress(((conversationProgress + counter) / directory.children.length));
            }
          );
        addConverstationStatsToGlobalStats(result.global, result.conversation[parsed.data.threadName]);
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
  let result: ConversationStats = {
    participants: conversation.participants,
    participantStats: {}
  };
  let counter = 0;
  for (var message of conversation.messages) {
    const date = new Date(message.timestamp);
    if (!result.participantStats[message.senderName]) {
      result.participantStats[message.senderName] = structuredClone(DefaultConversationParticipantStats);
    }

    switch (message.type) {
      case "text":
        result.participantStats[message.senderName].textMessages.count += 1;
        result.participantStats[message.senderName].textMessages.countDayOfWeek[date.getDay()] += 1;
        result.participantStats[message.senderName].textMessages.countTimeOfDay[date.getHours()] += 1;
        result.participantStats[message.senderName].textMessages.totalLength += message.text.length;
        result.participantStats[message.senderName].textMessages.wordCount =
          addIndividualCounts(
            result.participantStats[message.senderName].textMessages.wordCount,
            countWords(message.text)
          );
        break;
      case "link":
        result.participantStats[message.senderName].linkMessages.count += 1;
        result.participantStats[message.senderName].linkMessages.countDayOfWeek[date.getDay()] += 1;
        result.participantStats[message.senderName].linkMessages.countTimeOfDay[date.getHours()] += 1;
        break;
      case "media":
        result.participantStats[message.senderName].mediaCount += 1;
        break;
      case "placeholder":
        // TODO: count deleted? Probably not accurate
        break;
    }

    for (var reaction of message.reactions) {
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

function addConverstationStatsToGlobalStats(globalStats: GlobalStats, converstationStats: ConversationStats) {
  for (var participant of converstationStats.participants) {
    if (!globalStats[participant]) {
      globalStats[participant] = {
        totalTextMessages: 0,
        totalMedia: 0,
        totalReactions: 0,
        numberOfConversations: 0,
        wordCount: new Map()
      }
    }

    globalStats[participant].numberOfConversations += 1;

    if (converstationStats.participantStats[participant]) {
      globalStats[participant].totalTextMessages += converstationStats.participantStats[participant].textMessages.count ?? 0;
      globalStats[participant].totalMedia += converstationStats.participantStats[participant].mediaCount ?? 0;
      globalStats[participant].totalReactions += converstationStats.participantStats[participant].reactions.totalCount ?? 0;
      globalStats[participant].wordCount = addIndividualCounts(globalStats[participant].wordCount, converstationStats.participantStats[participant].textMessages.wordCount);
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
      .filter(x => !x.startsWith('http') && !x.includes('www.'))

  let result: IndividualCount = new Map<string, number>();
  split.forEach(key => {
    result.set(key, (result.get(key) ?? 0) + 1)
  });
  return result;
}