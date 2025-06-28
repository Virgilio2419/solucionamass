import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { HistServiciosAgendadosClienteComponent } from './hist-servicios-agendados-cliente.component';

describe('HistServiciosAgendadosClienteComponent', () => {
  let component: HistServiciosAgendadosClienteComponent;
  let fixture: ComponentFixture<HistServiciosAgendadosClienteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ HistServiciosAgendadosClienteComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HistServiciosAgendadosClienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
