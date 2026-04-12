import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageStats } from '../../../model/message-stats';
import { MatTableDataSource, MatTableModule} from '@angular/material/table';
import { MatSortModule,  MatSort, Sort  } from '@angular/material/sort';
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
    MatTableModule, MatSortModule , MatTabsModule
  ],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results implements AfterViewInit, OnInit {
  @ViewChild(MatSort) sort!: MatSort;


  // public chart?: Chart<"bar", string[], string>;
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
      (participant) => ({
        name: participant,
        textCount: data.global[participant].totalTextMessages,
        mediaCount: data.global[participant].totalMedia,
        reactionCount: data.global[participant].totalReactions,
        totalCount: data.global[participant].totalTextMessages + data.global[participant].totalMedia + data.global[participant].totalReactions
      })
    ));
  }

  ngAfterViewInit() {
    this.participantMessagesDataSource.sort = this.sort;
  }

  // createChart() {
  //   Chart.register(BarController, BarElement, CategoryScale, LinearScale)
  //   this.chart = new Chart("MyChart", {
  //     type: 'bar', //this denotes tha type of chart

  //     data: {// values on X-Axis
  //       labels: ['2022-05-10', '2022-05-11', '2022-05-12','2022-05-13',
  //                                '2022-05-14', '2022-05-15', '2022-05-16','2022-05-17', ], 
  //          datasets: [
  //         {
  //           label: "Sales",
  //           data: ['467','576', '572', '79', '92',
  //                                '574', '573', '576'],
  //           backgroundColor: 'blue'
  //         },
  //         {
  //           label: "Profit",
  //           data: ['542', '542', '536', '327', '17',
  //                                    '0.00', '538', '541'],
  //           backgroundColor: 'limegreen'
  //         }  
  //       ]
  //     },
  //     options: {
  //       aspectRatio:2.5
  //     }
  //   });
  // }
}
