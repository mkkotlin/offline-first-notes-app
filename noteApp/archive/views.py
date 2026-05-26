from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from notes.models import Note
from .models import ArchivedNote


def note_to_dict(note: Note) -> dict:
    return {
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'created_at': note.created_at.isoformat(),
        'updated_at': note.updated_at.isoformat(),
    }


# GET /api/archive/  — list all archived notes
@require_http_methods(['GET'])
def list_archived(request):
    archived = ArchivedNote.objects.select_related('note').all()
    data = [
        {
            'id': a.note.id,           # use Note's id — matches what archive/delete endpoints expect
            'title': a.note.title,
            'content': a.note.content,
            'created_at': a.note.created_at.isoformat(),
            'updated_at': a.note.updated_at.isoformat(),
            'is_archived': a.is_archived,
        }
        for a in archived
    ]
    return JsonResponse(data, safe=False)


# POST /api/archive/<note_id>/  — archive a note
@csrf_exempt
@require_http_methods(['POST'])
def archive_note(request, note_id):
    note = get_object_or_404(Note, pk=note_id)
    archived, created = ArchivedNote.objects.get_or_create(note=note)
    return JsonResponse(note_to_dict(note) | {'archived_id': archived.id, 'created': created})


# DELETE /api/archive/<note_id>/unarchive/  — unarchive (remove from archive)
@csrf_exempt
@require_http_methods(['DELETE'])
def unarchive_note(request, note_id):
    archived = get_object_or_404(ArchivedNote, note_id=note_id)
    archived.delete()
    return JsonResponse({'detail': 'unarchived'})


# DELETE /api/archive/<note_id>/  — permanently delete an archived note (note + archive entry)
@csrf_exempt
@require_http_methods(['DELETE'])
def delete_archived_note(request, note_id):
    archived = get_object_or_404(ArchivedNote, note_id=note_id)
    archived.note.delete()   # cascades to ArchivedNote too
    return JsonResponse({'detail': 'deleted'})


# DELETE /api/archive/  — delete ALL archived notes permanently
@csrf_exempt
@require_http_methods(['DELETE'])
def delete_all_archived(request):
    note_ids = list(ArchivedNote.objects.values_list('note_id', flat=True))
    Note.objects.filter(pk__in=note_ids).delete()
    return JsonResponse({'detail': f'deleted {len(note_ids)} notes'})
