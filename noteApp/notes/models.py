from django.db import models

# Create your models here.

class Note(models.Model):
    title=models.CharField(max_length=100, blank=True, default="Title")
    content=models.TextField(blank=True, default='')
    updated_at=models.DateTimeField(auto_now=True)
    created_at=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title