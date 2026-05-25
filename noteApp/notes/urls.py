from rest_framework.routers import DefaultRouter
from notes.views import NoteViewSet

router = DefaultRouter()


router.register(r'notes', NoteViewSet, basename='note')
urlpatterns = router.urls   