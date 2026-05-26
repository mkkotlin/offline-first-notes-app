from django.db import models
from notes.models import Note


# Create your models here.
class ArchivedNote(models.Model):
    is_archived = models.BooleanField(default=True)
    note = models.OneToOneField(Note, on_delete=models.CASCADE)
    def __str__(self):
        return self.note.title