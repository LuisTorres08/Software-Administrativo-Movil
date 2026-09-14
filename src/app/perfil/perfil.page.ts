import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, logOutOutline, personOutline, atOutline } from 'ionicons/icons';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: 'perfil.page.html',
  styleUrls: ['perfil.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
  ],
})
export class PerfilPage {
  private auth = inject(AuthService);

  readonly nombre = this.auth.nombre;
  readonly usuario = this.auth.usuario;
  readonly email = this.auth.user?.email ?? '';

  constructor() {
    addIcons({ personCircleOutline, logOutOutline, personOutline, atOutline });
  }

  get iniciales(): string {
    const base = this.nombre || this.usuario || '?';
    return base
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  logout(): void {
    this.auth.logout();
  }
}
