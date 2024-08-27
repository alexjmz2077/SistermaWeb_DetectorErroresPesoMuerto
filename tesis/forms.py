from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User

class RegistroForm(UserCreationForm):
    first_name = forms.CharField(max_length=30, required=True, help_text='Nombre')
    last_name = forms.CharField(max_length=30, required=True, help_text='Apellido')
    email = forms.EmailField(required=True)
    gender = forms.ChoiceField(choices=[('masculino', 'Masculino'), ('femenino', 'Femenino')])
    dob = forms.DateField(label="Fecha de Nacimiento", widget=forms.DateInput(attrs={'type': 'date'}))

    class Meta:
        model = User
        fields = ["first_name", "last_name", "username", "email", "password1", "password2", "gender", "dob"]


class LoginForm(AuthenticationForm):
    username = forms.CharField(label="Usuario")
    password = forms.CharField(widget=forms.PasswordInput, label="Contraseña")