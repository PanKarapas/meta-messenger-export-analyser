import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageStats } from '../../../model/message-stats';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { parseMapReplacer } from '../../../utils/json-utils';


interface ParticipantMessagesRow {
  name: string,
  textCount: number,
  mediaCount: number,
  reactionCount: number,
  totalCount: number
}

@Component({
  selector: 'app-results',
  imports: [
    MatTableModule, MatSortModule, MatTabsModule
  ],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results implements AfterViewInit, OnInit {
  @ViewChild(MatSort) sort!: MatSort;

  public displayedColumns: (keyof ParticipantMessagesRow)[] = ["name", "textCount", "mediaCount", "reactionCount", "totalCount"];
  public participantMessagesDataSource: MatTableDataSource<ParticipantMessagesRow> = new MatTableDataSource([] as ParticipantMessagesRow[]);

  constructor(private router: Router) { }

  ngOnInit(): void {
    const localStorageData = localStorage.getItem("data");
    if (!localStorageData) {
      //TODO: Notification
      this.router.navigate(["/file-select"]);
      return;
    }

    const data = JSON.parse(localStorageData, parseMapReplacer) as MessageStats;
    this.participantMessagesDataSource = new MatTableDataSource(Object.keys(data.global).map(
      (participant) => {
        const stats = data.global[participant];
        const textCount = stats.textMessages.count;
        const mediaCount = stats.mediaCount;
        const reactionCount = stats.reactions.totalCount;
        return {
          name: participant,
          textCount,
          mediaCount,
          reactionCount,
          totalCount: textCount + mediaCount + reactionCount
        }
      }
    ));
  }

  ngAfterViewInit() {
    this.participantMessagesDataSource.sort = this.sort;
  }
}
