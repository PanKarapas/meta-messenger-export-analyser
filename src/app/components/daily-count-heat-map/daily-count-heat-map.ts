import { Component, computed, effect, input, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon';

import { Chart } from 'chart.js';
import { DailyCount, DayCount } from '../../../model/message-stats';
import { MatrixDataPoint } from 'chartjs-chart-matrix';
import { color } from "chart.js/helpers";

import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';

dayjs.extend(isLeapYear);
dayjs.extend(dayOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);

import { MatChipsModule } from '@angular/material/chips'

type MatrixDataPointWithValue = MatrixDataPoint & {
  counts: DayCount,
};

@Component({
  selector: 'app-daily-count-heat-map',
  imports: [MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule, MatFormField, MatInputModule, MatChipsModule],
  templateUrl: './daily-count-heat-map.html',
  styleUrl: './daily-count-heat-map.scss',
})
export class DailyCountHeatMap implements OnInit, OnDestroy {

  includedValues = signal<{text: boolean, media: boolean, links: boolean}>({text: true, media: true, links: true});

  dailyCount = input.required<DailyCount | undefined>();

  calendarChart!: Chart<"matrix", MatrixDataPointWithValue[], string>;
  calendarSelectedYearIndex = signal<number>(0);
  calendarAvailableYears = computed(() => {
    const count = this.dailyCount();
    if (!count) {
      return [new Date().getFullYear().toString()];
    }
    const temp = [...count.keys()].reduce(
      (acc, curr) => {
        const currYear = curr.split('-')[0];
        if (acc.includes(currYear)) {
          return acc;
        }
        return [...acc, currYear];
      },
      [] as string[]
    );

    temp.sort();

    return temp;
  });
  calendarMaxValue = computed(() => {
    const index = this.calendarSelectedYearIndex();
    const availableYears = this.calendarAvailableYears();
    return this.getCalendarMaxValue(availableYears[index]);
  });

  // It's called later, needs to be arrow to bind this
  datePickerFilter = (date: Date | null) => {
    if (!date) {
      return false;
    }
    return this.calendarAvailableYears().includes(date.getFullYear().toString());
  };

  constructor() {
    effect(() => {
      const year = this.calendarAvailableYears()[this.calendarSelectedYearIndex()];
      const { data, numberOfWeeks } = this.getCalendarData(year);

      if (this.calendarChart?.data.datasets[0]?.data) {
        this.calendarChart.data.datasets[0].data = data;
      };
      const xScale = this.calendarChart?.options?.scales?.['x'];
      if (xScale) {
        xScale.max = numberOfWeeks;
      }
      this.calendarChart?.update('none')
    });
  }

  ngOnInit(): void {
    this.createCalendarChart(this.calendarAvailableYears()[this.calendarSelectedYearIndex()]);
  }

  ngOnDestroy(): void {
    this.calendarChart?.destroy();
  }

  calendarYearSelected(date: Date, datepicker: MatDatepicker<Date>): void {
    const index = this.calendarAvailableYears().findIndex(year => year === date.getFullYear().toString());

    if (index !== -1) {
      this.calendarSelectedYearIndex.set(index);
    }

    datepicker.close();
  }

  getDatePickerStartDate(): Date {
    return new Date(this.calendarAvailableYears()[this.calendarSelectedYearIndex()]);
  }
  getNumberOfWeeks(year: string) {
    const first = dayjs(year);
    const numberOfDays = first.isLeapYear() ? 366 : 365;
    // Take the total number of days, add first day (0 for sunday, 1-6 for anything else)
    // By adding the first day, if it was anything but sunday, we are adding 1 day, as the weeks won't allign perfectly
    const weeks = Math.ceil((numberOfDays + first.day()) / 7);
    return weeks;
  }

  getCalendarMaxValue(year: string): number {
    const count = this.dailyCount();
    if (!count) {
      throw new Error("Called getCalendarMaxValue with undefined globalParticipantStats");
    }

    const filteredData = [...count.entries()].filter(([key, _]) => key.startsWith(year));
    // maxValue might be 0
    return filteredData.reduce((acc, [_, curr]) => Math.max(acc, this.sumDayCount(curr, this.includedValues())), 0);
  }

  getCalendarData(year: string): { data: MatrixDataPointWithValue[], numberOfWeeks: number } {
    const count = this.dailyCount();

    const isLeapYear = dayjs(year).isLeapYear();
    const numberOfWeeks = this.getNumberOfWeeks(year);

    return {
      data: [... new Array(isLeapYear ? 366 : 365).keys()].map((day) => {
        const date = dayjs(year).dayOfYear(day + 1);
        const value: DayCount = count?.get(date.format('YYYY-MM-DD')) ?? { text: 0, media: 0, links: 0 };

        return {
          x: (date.weekYear() > date.year() ? numberOfWeeks - 1 : 0) + date.week(),
          y: date.day(),
          counts: value
        }
      }),
      numberOfWeeks
    }
  }

  sumDayCount(count: DayCount, selectedValues: {
    text: boolean;
    media: boolean;
    links: boolean;
}): number {
    return (selectedValues.text ? count.text : 0) +
      (selectedValues.media ? count.media : 0) + 
      (selectedValues.links ? count.links : 0);
  }

  createCalendarChart(year: string) {
    const { data, numberOfWeeks } = this.getCalendarData(year);

    this.calendarChart = new Chart("calendarChart", {
      type: 'matrix',
      data: {
        datasets: [{
          label: 'Basic matrix',
          data,
          borderWidth: 1,
          borderRadius: 1,
          borderColor: 'rgba(0,0,0,0.5)',
          backgroundColor: ({ raw }) => {
            const value = this.sumDayCount((raw as MatrixDataPointWithValue).counts, this.includedValues());

            if (value === 0) {
              return color('#444444').rgbString();
            }

            const intensity = value / this.calendarMaxValue();
            const colors = ['#FFCC00', '#FF7F4B', '#FF363F', '#C4171E'] as const;

            return colors[Math.floor(intensity * (colors.length - 1))];
          },
          width: ({ chart }) => (chart.chartArea.width / numberOfWeeks) - 3,
          height: ({ chart }) => (chart.chartArea.height / 7) - 1
        }]
      },
      options: {
        plugins: {
          tooltip: {
            displayColors: false,
            bodyFont: {
              family: 'monospace'
            },
            callbacks: {
              title: ([{ raw }]) => {
                const parsed = raw as MatrixDataPointWithValue;
                return dayjs(this.calendarAvailableYears()[this.calendarSelectedYearIndex()]).week(parsed.x).day(parsed.y).format('YYYY-MM-DD');
              },
              label: ({ raw }) => {
                const parsed = raw as MatrixDataPointWithValue;
                const includedValues = this.includedValues();
                const count = this.sumDayCount(parsed.counts, includedValues);
                const result = [];
                if(includedValues.text) {
                  result.push(`Texts: ${parsed.counts.text}`);
                }
                if(includedValues.links) {
                  result.push(`Links: ${parsed.counts.links}`);
                }
                if(includedValues.media) {
                  result.push(`Media: ${parsed.counts.media}`);
                }

                if(Object.values(includedValues).filter(val => val).length > 1) {
                  result.push(`Total: ${count}`);
                }
                return result;
              },
            }
          }
        },
        // Not using time scales because I felt like writing my own implementation for fun.
        scales: {
          x: {
            axis: 'x',
            type: 'linear',
            min: 1,
            max: numberOfWeeks,
            ticks: {
              count: 12,
              callback: (_, index) => ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]
            },
            position: 'top',
            offset: true
          },
          y: {
            axis: 'y',
            type: 'linear',
            min: 0,
            max: 6,
            ticks: {
              count: 7,
              callback: (_, index) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][6 - index]
            },
            position: 'left',
            offset: true
          }
        }
      }
    });
  }
}
