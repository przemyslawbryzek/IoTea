import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { TeaModule } from '../tea/tea.module';

@Module({
  imports: [TeaModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
