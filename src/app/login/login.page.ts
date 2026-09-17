import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  lockClosedOutline,
  alertCircleOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonSpinner,
    IonIcon,
  ],
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPass = signal(false);

  readonly form = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    clave: ['', Validators.required],
  });

  constructor() {
    addIcons({
      personOutline,
      lockClosedOutline,
      alertCircleOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    const { usuario, clave } = this.form.getRawValue();
    this.auth.login(usuario, clave).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/tabs/pendientes', { replaceUrl: true });
      },
      error: (err) => {
        this.loading.set(false);
        const msg =
          err?.error?.message ??
          (err?.status === 0
            ? 'No se pudo conectar con el servidor.'
            : 'Usuario o contraseña incorrectos.');
        this.error.set(msg);
      },
    });
  }
}
