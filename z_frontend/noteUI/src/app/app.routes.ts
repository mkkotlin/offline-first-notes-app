import { Routes } from '@angular/router';
import { NoteAppComponent } from './note-app/note-app.component';
import { ArchiveComponent } from './archive/archive.component';

export const routes: Routes = [
    {
        path: 'notes',
        component: NoteAppComponent
    },
    {
        path: 'archives',
        component: ArchiveComponent
    },
    {
        path: '**',
        redirectTo: 'notes'
    },
];
