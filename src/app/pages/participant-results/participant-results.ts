import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GlobalParticipantStats, MessageStats } from '../../../model/message-stats';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

import { addIndividualCounts, individualCountToFrequencyRows } from '../../../utils/individual-counts-utils';
import { FrequencyRow } from '../../../model/shared-ui-types';
import { parseMapReplacer } from '../../../utils/json-utils';
import { FrequencyRowTable } from "../../components/frequency-row-table/frequency-row-table";

import { Chart, BubbleController, LinearScale, PointElement, CategoryScale, Tooltip, BubbleDataPoint, Title } from "chart.js";

type BubbleDataPointWithCount = { x: string, y: string, r: number; count: number; }

Chart.register(BubbleController, LinearScale, PointElement, CategoryScale, Tooltip, Title);
@Component({
  selector: 'app-participant-results',
  imports: [MatTabsModule, FrequencyRowTable],
  templateUrl: './participant-results.html',
  styleUrl: './participant-results.scss',
})
export class ParticipantResults implements OnInit, OnDestroy {
  wordFrequencyDataSource: MatTableDataSource<FrequencyRow> = new MatTableDataSource([] as FrequencyRow[]);
  reactionFrequencyDataSource: MatTableDataSource<FrequencyRow> = new MatTableDataSource([] as FrequencyRow[]);
  chart!: Chart<"bubble", BubbleDataPointWithCount[], string>;

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
    const globalParticipantData = data.global[participantName];
    if (globalParticipantData) {
      this.createChartTimeGraph(globalParticipantData);
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  createChartTimeGraph(data: GlobalParticipantStats) {
    const dayOfTheWeekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const timeOfDayLabels = [
      "12 am", "1 am", "2 am", "3 am", "4 am", "5 am", "6 am", "7 am", "8 am", "9 am", "10 am", "11 am",
      "12 pm", "1 pm", "2 pm", "3 pm", "4 pm", "5 pm", "6 pm", "7 pm", "8 pm", "9 pm", "10 pm", "11 pm"];
    // Note min value will be 1 to avoid div by 0
    const biggestDayTime = data.textMessages.countByDayAndTime.reduce((acc, curr) => Math.max(acc, Math.max(...curr)), 1);
    this.chart = new Chart("timeChart", {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Text count',
          tooltip: {
            callbacks: {
              label: (item) => {
                const raw = item.raw as BubbleDataPointWithCount;
                return `${dayOfTheWeekLabels[item.parsed.y ?? 0]}, ${timeOfDayLabels[item.parsed.x ?? 0]}: ${raw.count} ` +
                  `(${(raw.count / data.textMessages.count).toLocaleString(undefined, { style: 'percent', minimumFractionDigits: 2 })})`;
              }
            }
          },
          data: data.textMessages.countByDayAndTime.flatMap((hoursCount, dayIndex) => {
            return hoursCount.map((count, hourIndex) => ({
              y: dayOfTheWeekLabels[dayIndex],
              x: timeOfDayLabels[hourIndex],
              r: (count / biggestDayTime) * 10,
              count
            }));
          }),
          backgroundColor: 'rgb(255, 99, 132)'
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Texting frequency during the week"
          }
        },
        scales: {
          y: {
            axis: 'y',
            type: "category",
            position: 'left',
            labels: dayOfTheWeekLabels
          },
          x: {
            axis: "x",
            type: "category",
            position: 'bottom',
            labels: timeOfDayLabels
          }
        }
      }
    });
  }
}
