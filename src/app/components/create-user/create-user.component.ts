import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormArray, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { Usuario } from 'src/app/models/usuario';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss'],
  standalone: false
})
export class CreateUserComponent implements OnInit {

  userForm: FormGroup;
  esPrestador = false;
  especialidades: string[] = [];
  regiones: string[] = [];
  comunasDisponibles: string[] = [];
  fotoBase64: string | null = null;

  regionesYComunas: { [region: string]: string[] } = {
    'Arica y Parinacota': ['Arica', 'Camarones', 'Putre', 'General Lagos'],
    'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica', 'Huara', 'Camiña', 'Colchane'],
    'Antofagasta': ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal', 'Calama', 'San Pedro de Atacama', 'Ollagüe', 'Tocopilla', 'María Elena'],
    'Atacama': ['Copiapó', 'Caldera', 'Tierra Amarilla', 'Vallenar', 'Freirina', 'Huasco', 'Chañaral', 'Diego de Almagro'],
    'Coquimbo': ['La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Vicuña', 'Paiguano', 'Ovalle', 'Monte Patria', 'Combarbalá', 'Punitaqui', 'Illapel', 'Los Vilos', 'Salamanca'],
    'Valparaíso': ['Valparaíso', 'Viña del Mar', 'Quilpué', 'Villa Alemana', 'Concón', 'Quillota', 'San Antonio', 'La Ligua', 'Petorca', 'Zapallar', 'Papudo', 'Puchuncaví', 'Casablanca', 'Limache'],
    'Región Metropolitana': ['Santiago', 'Puente Alto', 'Maipú', 'La Florida', 'Peñalolén', 'Las Condes', 'Lo Barnechea', 'San Bernardo', 'El Bosque', 'Estación Central', 'Ñuñoa', 'Recoleta', 'La Reina', 'Pudahuel'],
    'O’Higgins': ['Rancagua', 'Machalí', 'San Fernando', 'Santa Cruz', 'Rengo', 'San Vicente', 'Pichilemu'],
    'Maule': ['Talca', 'Curicó', 'Linares', 'Cauquenes', 'Constitución', 'Parral', 'San Javier'],
    'Ñuble': ['Chillán', 'Bulnes', 'Quirihue', 'San Carlos', 'Coelemu', 'Yungay'],
    'Biobío': ['Concepción', 'Talcahuano', 'Hualpén', 'Coronel', 'Lota', 'Los Ángeles', 'Chiguayante', 'San Pedro de la Paz'],
    'La Araucanía': ['Temuco', 'Padre Las Casas', 'Angol', 'Victoria', 'Villarrica', 'Pucón'],
    'Los Ríos': ['Valdivia', 'La Unión', 'Río Bueno', 'Futrono', 'Lago Ranco'],
    'Los Lagos': ['Puerto Montt', 'Puerto Varas', 'Castro', 'Ancud', 'Osorno', 'Quellón'],
    'Aysén': ['Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane'],
    'Magallanes': ['Punta Arenas', 'Puerto Natales', 'Porvenir', 'Puerto Williams']
  };

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  constructor(
    private userService: UserService,
    private router: Router,
    private auth: Auth
  ) {
    this.userForm = new FormGroup({
      nombres: new FormControl('', [Validators.required, Validators.minLength(2)]),
      apellidos: new FormControl('', [Validators.required, Validators.minLength(2)]),
      telefono: new FormControl('', [Validators.required, Validators.pattern('^[0-9]{9}$')]),
      direccion: new FormControl('', Validators.required),
      region: new FormControl('', Validators.required),
      comuna: new FormControl('', Validators.required),
      fechaNacimiento: new FormControl('', Validators.required),
      rut: new FormControl('', Validators.required),
      numeroDocumento: new FormControl('', Validators.required),
      especialidad: new FormControl(''),
      certificaciones: new FormArray([]),
      horarioLaboral: new FormArray([]),
      email: new FormControl('', [Validators.required, Validators.email])
    });
  }

  ngOnInit() {
    this.especialidades = ['Electricidad', 'Albañilería', 'Gasfitería', 'Carpintería'];

    this.regiones = Object.keys(this.regionesYComunas);

    // Inicializar horario laboral (7 días)
    this.diasSemana.forEach(dia => {
      const grupo = new FormGroup({
        dia: new FormControl(dia),
        desde: new FormControl(''),
        hasta: new FormControl(''),
        noDisponible: new FormControl(false)
      });
      (this.userForm.get('horarioLaboral') as FormArray).push(grupo);
    });

    const currentUser = this.auth.currentUser;
    if (currentUser && currentUser.email) {
      this.userForm.get('email')?.setValue(currentUser.email);
    } else {
      console.warn('⚠️ Usuario no autenticado o sin correo.');
    }
  }

  get certificaciones(): FormArray {
    return this.userForm.get('certificaciones') as FormArray;
  }

  get horarioLaboral(): FormArray {
    return this.userForm.get('horarioLaboral') as FormArray;
  }

  onRegionChange(region: string) {
    this.comunasDisponibles = this.regionesYComunas[region] || [];
    this.userForm.get('comuna')?.setValue('');
  }

  togglePrestador() {
    this.esPrestador = !this.esPrestador;

    if (!this.esPrestador) {
      this.userForm.get('especialidad')?.setValue('');
      this.certificaciones.clear();
    } else {
      if (this.certificaciones.length === 0) {
        this.agregarCertificacion();
      }
    }
  }

  agregarCertificacion() {
    const certForm = new FormGroup({
      institucionCertifica: new FormControl('', Validators.required),
      codigoCertificado: new FormControl('', Validators.required)
    });
    this.certificaciones.push(certForm);
  }

  eliminarCertificacion(index: number) {
    this.certificaciones.removeAt(index);
  }

  toggleDisponibilidad(index: number, noDisponible: boolean) {
    const grupo = this.horarioLaboral.at(index);
    grupo.get('noDisponible')?.setValue(noDisponible);

    if (noDisponible) {
      grupo.get('desde')?.setValue('');
      grupo.get('hasta')?.setValue('');
    }
  }

  formularioValido(): boolean {
    if (!this.userForm.valid) return false;

    if (this.esPrestador) {
      if (!this.userForm.get('especialidad')?.value) return false;
      if (this.certificaciones.length === 0) return false;
      for (let i = 0; i < this.certificaciones.length; i++) {
        if (this.certificaciones.at(i).invalid) return false;
      }
    }

    return true;
  }

  async onSubmit() {
    if (!this.formularioValido()) {
      console.log('Formulario inválido');
      return;
    }

    const usuario: Usuario = {
      ...this.userForm.value,
      esPrestador: this.esPrestador,
      fotoPerfilBase64: this.fotoBase64 || null
    };

    try {
      const response = await this.userService.addUser(usuario);
      console.log('✅ Usuario creado:', response);
      this.userForm.reset();
      this.certificaciones.clear();
      this.esPrestador = false;
      this.fotoBase64 = null;
      this.router.navigate(['/main']);
    } catch (error) {
      console.error('❌ Error al guardar usuario:', error);
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) {
      this.fotoBase64 = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.fotoBase64 = reader.result as string;
    };
    reader.readAsDataURL(file);
  }



// Añade este helper para usar en el template:
get certificacionesControls(): FormGroup[] {
  return this.certificaciones.controls as FormGroup[];
}
get horarioLaboralControls(): FormGroup[] {
  return this.horarioLaboral.controls as FormGroup[];
}
}
