import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReturnTransbankPage } from './return-transbank.page';

describe('ReturnTransbankPage', () => {
  let component: ReturnTransbankPage;
  let fixture: ComponentFixture<ReturnTransbankPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReturnTransbankPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
