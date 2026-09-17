import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  personOutline,
  atOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { App } from '@capacitor/app';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-perfil',
  templateUrl: 'perfil.page.html',
  styleUrls: ['perfil.page.scss'],
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon],
})
export class PerfilPage {
  private auth = inject(AuthService);
  private alertCtrl = inject(AlertController);

  readonly nombre = this.auth.nombre;
  readonly usuario = this.auth.usuario;
  readonly email = this.auth.user?.email ?? '';
  readonly version = signal('1.0.0');

  constructor() {
    addIcons({ logOutOutline, personOutline, atOutline, shieldCheckmarkOutline });
    this.loadVersion();
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

  private async loadVersion(): Promise<void> {
    try {
      const info = await App.getInfo();
      this.version.set(info.build ? `${info.version} (${info.build})` : info.version);
    } catch {
      // Plataforma web u otro entorno sin App.getInfo(): se mantiene el fallback.
    }
  }

  async confirmLogout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: '¿Cerrar sesión?',
      message: 'Tendrás que iniciar sesión de nuevo para continuar.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar', role: 'destructive', handler: () => this.logout() },
      ],
    });
    await alert.present();
  }

  logout(): void {
    this.auth.logout();
  }
}
