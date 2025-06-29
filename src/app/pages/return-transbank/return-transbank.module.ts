import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReturnTransbankPageRoutingModule } from './return-transbank-routing.module';
import { ReturnTransbankPage } from './return-transbank.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReturnTransbankPageRoutingModule
  ],
  declarations: [ReturnTransbankPage]
})
export class ReturnTransbankPageModule {}