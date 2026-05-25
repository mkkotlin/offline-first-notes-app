import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoteAppComponent } from './note-app.component';

describe('NoteAppComponent', () => {
  let component: NoteAppComponent;
  let fixture: ComponentFixture<NoteAppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoteAppComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoteAppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
