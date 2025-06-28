import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HistSolicitudesServicioComponent } from './hist-solicitudes-servicio.component';

describe('HistSolicitudesServicioComponent', () => {
  let component: HistSolicitudesServicioComponent;
  let fixture: ComponentFixture<HistSolicitudesServicioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HistSolicitudesServicioComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HistSolicitudesServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
