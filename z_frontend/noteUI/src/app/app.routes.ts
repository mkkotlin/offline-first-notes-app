import { Routes } from '@angular/router';
import { NoteAppComponent } from './note-app/note-app.component'

export const routes: Routes = [
    {
        path: 'notes',
        component: NoteAppComponent
    },
    {
        path: '**',
        redirectTo: 'notes'
    },
];
