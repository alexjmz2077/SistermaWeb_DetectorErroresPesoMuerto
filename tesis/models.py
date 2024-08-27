from django.db import models
from django.contrib.auth.models import User

class SesionEntrenamiento(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)  # Relación con el usuario de Django
    numero_error = models.IntegerField()  # Número de error
    tipo_error = models.CharField(max_length=255)  # Tipo de error
    hora_error = models.DateTimeField(auto_now_add=True)  # Hora del error, se registra automáticamente cuando se crea la entrada

    def __str__(self):
        return f"Error {self.numero_error} - {self.tipo_error} - {self.hora_error} - Usuario: {self.usuario.username}"
