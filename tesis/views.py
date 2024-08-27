from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import SesionEntrenamiento

def inicio(request):
    return render(request, 'inicio.html')

def recomendaciones(request):
    return render(request, 'test.html')

def predict_frame(request):
    return render(request, 'analisis.html')

def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('inicio')
        else:
            # Si el login falla, agregamos una variable de contexto para la alerta de error.
            return render(request, 'inicio.html', {'login_error': True})
    return render(request, 'inicio.html')


def register_view(request):
    if request.method == 'POST':
        first_name = request.POST['first_name']
        last_name = request.POST['last_name']
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        gender = request.POST['gender']
        dob = request.POST['dob']

        # Verificar si el nombre de usuario ya existe
        if User.objects.filter(username=username).exists():
            return render(request, 'inicio.html', {'register_error': 'El nombre de usuario ya existe. Por favor, elija otro.'})
        
        # Verificar si el correo electrónico ya existe
        if User.objects.filter(email=email).exists():
            return render(request, 'inicio.html', {'register_error': 'El correo electrónico ya está registrado. Por favor, utilice otro correo.'})

        # Crear el usuario si no existe
        user = User.objects.create_user(username=username, email=email, password=password)
        user.first_name = first_name
        user.last_name = last_name
        user.save()

        login(request, user)
        return redirect('inicio')

    return redirect('inicio')



@csrf_exempt  # Deshabilita la verificación CSRF para esta vista específica (¡ten cuidado con la seguridad!)
def registrar_error_api(request):
    if request.method == 'POST':
        usuario = request.user  # El usuario autenticado
        numero_error = int(request.POST.get('numero_error'))
        tipo_error = request.POST.get('tipo_error')
        hora_error = timezone.now()

        # Guardar la sesión de entrenamiento
        SesionEntrenamiento.objects.create(
            usuario=usuario,
            numero_error=numero_error,
            tipo_error=tipo_error,
            hora_error=hora_error,
        )

        return JsonResponse({'status': 'success', 'message': 'Error registrado exitosamente.'})
    return JsonResponse({'status': 'error', 'message': 'Método no permitido.'}, status=405)