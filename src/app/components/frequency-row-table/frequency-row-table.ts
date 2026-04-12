import { ScrollingModule } from '@angular/cdk/scrolling';
import { AfterViewInit, Component, input, Input, ViewChild } from '@angular/core';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FrequencyRow } from '../../../model/shared-ui-types';
import { DataSource } from '@angular/cdk/table';

@Component({
  selector: 'app-frequency-row-table',
  imports: [MatTableModule, MatSortModule, ScrollingModule, MatTooltipModule],
  templateUrl: './frequency-row-table.html',
  styleUrl: './frequency-row-table.scss',
})
export class FrequencyRowTable implements AfterViewInit{
  dataSource = input.required<MatTableDataSource<FrequencyRow>>();
  nameHeader = input.required<string>();
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: (keyof FrequencyRow | "index")[] = [ "index", "name", "count", "frequency"];

  trackBy = (index: number, el: FrequencyRow) => el.id;
  

  constructor(){}

  ngAfterViewInit(): void {
        this.dataSource().sort = this.sort;
  }
}
