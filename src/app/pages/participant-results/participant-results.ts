import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageStats } from '../../../model/message-stats';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { addIndividualCounts, individualCountToFrequencyRows } from '../../../utils/individual-counts-utils';
import { FrequencyRow } from '../../../model/shared-ui-types';
import { parseMapReplacer } from '../../../utils/json-utils';
import { FrequencyRowTable } from "../../components/frequency-row-table/frequency-row-table";


@Component({
  selector: 'app-participant-results',
  imports: [MatTabsModule, FrequencyRowTable],
  templateUrl: './participant-results.html',
  styleUrl: './participant-results.scss',
})
export class ParticipantResults implements OnInit {
  wordFrequencyDataSource: MatTableDataSource<FrequencyRow> = new MatTableDataSource([] as FrequencyRow[]);
  reactionFrequencyDataSource: MatTableDataSource<FrequencyRow> = new MatTableDataSource([] as FrequencyRow[]);

  constructor(private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    const participantName = this.route.snapshot.paramMap.get('participantName');
    const localStorageData = localStorage.getItem("data");
    if (!localStorageData || !participantName) {
      //TODO: Notification
      this.router.navigate(["/file-select"]);
      return;
    }

    const data = JSON.parse(localStorageData, parseMapReplacer) as MessageStats;

    const individualWordCount = Object.values(data.conversation)
      .filter(conversation => conversation.participants.includes(participantName) && conversation.participantStats[participantName])
      .map(conversation => conversation.participantStats[participantName].textMessages.wordCount)
      .reduce((acc, curr) => addIndividualCounts(acc, curr), new Map());


    this.wordFrequencyDataSource = new MatTableDataSource(individualCountToFrequencyRows(individualWordCount));

    const individualReactionCount = Object.values(data.conversation)
      .filter(conversation => conversation.participants.includes(participantName) && conversation.participantStats[participantName])
      .map(conversation => conversation.participantStats[participantName].reactions.individualCount)
      .reduce((acc, curr) => addIndividualCounts(acc, curr), new Map());

    this.reactionFrequencyDataSource = new MatTableDataSource(individualCountToFrequencyRows(individualReactionCount));
  }
}
