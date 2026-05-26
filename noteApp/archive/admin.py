from django.contrib import admin
from archive.models import ArchivedNote

# Register your models here.
@admin.register(ArchivedNote)
class ArchivedNoteAdmin(admin.ModelAdmin):
    list_display = ('note__title', 'is_archived')
    list_filter = ('is_archived', 'note__created_at', 'note__updated_at')
    search_fields = ('note__title', 'note__content')
    ordering = ('note__created_at',)