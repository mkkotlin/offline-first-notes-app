from django.core.serializers import serialize
from django.shortcuts import render
from rest_framework import viewsets
from .serializers import NoteSerializer
from .models import Note

# Create your views here.
class NoteViewSet(viewsets.ModelViewSet):
    # Exclude notes that have been archived (have a related ArchivedNote entry)
    queryset = Note.objects.filter(archivednote__isnull=True)
    serializer_class = NoteSerializer