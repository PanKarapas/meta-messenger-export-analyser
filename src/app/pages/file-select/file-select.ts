import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from "@angular/material/icon";
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { fileListToDirectory } from '../../../utils/file-list-to-directory';
import type { WorkerOutgoing } from '../../../workers/directory-process-worker.worker';
import { Router } from '@angular/router';
import { stringifyMapReplacer } from '../../../utils/json-utils';

@Component({
  selector: 'app-file-select',
  imports: [MatButtonModule, MatIcon, MatProgressBarModule],
  templateUrl: './file-select.html',
  styleUrl: './file-select.scss',
})
export class FileSelect {

  public percentDone = signal(0);

  public fileSelected: boolean = false;

  constructor(private router: Router) { }

  async onFileSelected(event: Event) {
    console.log(JSON.stringify(event, null, 2));
      const files = (event.target as HTMLInputElement).files;
      if(!files) {
        return;
      }

      const directory = fileListToDirectory(files);
      if(!directory) {
        // TODO: display error
        return;
      }
      this.fileSelected = true;
      const worker = new Worker(new URL('../../../workers/directory-process-worker.worker', import.meta.url));
      worker.onmessage = ({ data }) => {
        const dataAs = data as WorkerOutgoing;
        switch(dataAs.type){
          case "Progress": 
            this.percentDone.set(dataAs.progress * 100);
            break;
          case "Done":
            localStorage.setItem("data", JSON.stringify(dataAs.result, stringifyMapReplacer));
            this.router.navigate(["/results"]);
            this.fileSelected = false;
            this.percentDone.set(0);
            break;
        }
      };
      worker.postMessage(directory);
  }
}
