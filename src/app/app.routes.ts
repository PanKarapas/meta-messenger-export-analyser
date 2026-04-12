import { Routes } from '@angular/router';
import { FileSelect } from './pages/file-select/file-select';
import { Results } from './pages/results/results';
import { ParticipantResults } from './pages/participant-results/participant-results';

export const routes: Routes = [
    {
        path: 'file-select',
        component: FileSelect
    },
    {
        path: 'results',
        component: Results,
    },
    {
        path: 'results/participant/:participantName',
        component: ParticipantResults
    }
];
