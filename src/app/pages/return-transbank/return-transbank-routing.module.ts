import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ReturnTransbankPage } from './return-transbank.page';

const routes: Routes = [
  {
    path: '',
    component: ReturnTransbankPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReturnTransbankPageRoutingModule {}