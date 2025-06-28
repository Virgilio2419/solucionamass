import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { addDoc, collection, Firestore, query, where, collectionData,getDocs, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Usuario } from '../models/usuario';
import { authState } from '@angular/fire/auth';
import { sendEmailVerification, sendPasswordResetEmail } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  
  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(null);
  usuarioActual$ = this.usuarioActualSubject.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) { }

  register({ email, password }: any) {
    return createUserWithEmailAndPassword(this.auth, email, password).then(cred => {
      if (cred.user) {
        return sendEmailVerification(cred.user).then(() => {
          return cred;
        });
      }
      throw new Error('No se pudo crear el usuario');
    });
  }

  login({ email, password }: any) {
    return signInWithEmailAndPassword(this.auth, email, password).then((cred) => {
      if (!cred.user.emailVerified) {
        signOut(this.auth);
        const error: any = new Error('Correo no verificado');
        error.code = 'auth/email-not-verified';
        throw error;
      }
      return cred;
    });
  }

  logout() {
    this.actualizarUsuarioActual(null);  // Limpiar usuario actual al salir
    return signOut(this.auth);
  }

  loginWithGoogle() {
    return signInWithPopup(this.auth, new GoogleAuthProvider());
  }

async addUser(usuario: Usuario): Promise<Usuario> {
  const uid = this.auth.currentUser?.uid;
  if (!uid) throw new Error('Usuario no autenticado');

  const userRef = doc(this.firestore, 'usuarios', uid);
  await setDoc(userRef, usuario);

  return { ...usuario, id: uid };
}

  async getPrestadores(): Promise<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef, where('esPrestador', '==', true));
    const usuariosSnap = await getDocs(q);

    return usuariosSnap.docs.map(doc => {
      const data = doc.data() as Usuario;
      return {
        ...data,
        id: doc.id
      };
    });
  }

  async getUsers(): Promise<Usuario[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef);
    const usuariosSnap = await getDocs(q);

    return usuariosSnap.docs.map(doc => {
      const data = doc.data() as Usuario;
      return {
        ...data,
        id: doc.id
      };
    });
  }

  async usuarioExistePorEmail(email: string): Promise<boolean> {
    const usuarios = await this.getUsers();
    return usuarios.some(user => user.email === email);
  }

  async getUsuarioPorEmail(email: string): Promise<Usuario | undefined> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef, where('email', '==', email));
    const usuariosSnap = await getDocs(q);

    if (usuariosSnap.empty) return undefined;

    const docData = usuariosSnap.docs[0];
    const data = docData.data() as Usuario;
    return {
      ...data,
      id: docData.id
    };
  }

  getAuthState() {
    return authState(this.auth);
  }

  async enviarResetPassword(email: string): Promise<void> {
    const actionCodeSettings = {
      url: 'https://solucionamass.firebaseapp.com',
      handleCodeInApp: false,
    };
    return sendPasswordResetEmail(this.auth, email, actionCodeSettings);
  }

  async getUsuarioActual(): Promise<Usuario | null> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.actualizarUsuarioActual(null);
      return null;
    }

    const docRef = doc(this.firestore, 'usuarios', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      this.actualizarUsuarioActual(null);
      return null;
    }

    const usuario = docSnap.data() as Usuario;
    usuario.id = docSnap.id;
    
    this.actualizarUsuarioActual(usuario);  // Actualiza BehaviorSubject

    return usuario;
  }

  actualizarUsuarioActual(usuario: Usuario | null) {
    this.usuarioActualSubject.next(usuario);
  }

}
