from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_archived, name='archive-list'),
    path('delete-all/', views.delete_all_archived, name='archive-delete-all'),
    path('<int:note_id>/', views.archive_note, name='archive-note'),
    path('<int:note_id>/unarchive/', views.unarchive_note, name='unarchive-note'),
    path('<int:note_id>/delete/', views.delete_archived_note, name='archive-delete-one'),
]
