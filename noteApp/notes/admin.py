from django.contrib import admin
from notes.models import Note
# Register your models here.

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ('title', 'updated_at', 'created_at')