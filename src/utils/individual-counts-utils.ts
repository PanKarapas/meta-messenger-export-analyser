import { IndividualCount } from "../model/message-stats";
import { FrequencyRow } from "../model/shared-ui-types";

export function addIndividualCounts(objectA: IndividualCount, objectB: IndividualCount): IndividualCount {
  const uniqueKeys = [...new Set([...objectA.keys(), ...objectB.keys()])];
  const result: IndividualCount = new Map();

  uniqueKeys.forEach(key => {
    result.set(key, (objectA.get(key) ?? 0) + (objectB.get(key) ?? 0));
  });
  return result;
}

export function individualCountToFrequencyRows(counts: IndividualCount): Array<FrequencyRow> {
    const total = [...counts.values()].reduce((acc, curr) => acc + curr, 0);

    return [...counts.entries()].map(([key, value], index) => ({id: index, name: key, count: value, frequency: value/total }));
}