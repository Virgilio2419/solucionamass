import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ServiciosAgendadosClienteComponent } from './servicios-agendados-cliente.component';

describe('ServiciosAgendadosClienteComponent', () => {
  let component: ServiciosAgendadosClienteComponent;
  let fixture: ComponentFixture<ServiciosAgendadosClienteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ServiciosAgendadosClienteComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ServiciosAgendadosClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
