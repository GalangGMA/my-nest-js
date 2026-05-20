import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UserRegisteredListener } from './listeners/user-registered.listener';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      global: true,
      wildcard: false,
      delimiter: '.',
    }),
  ],
  providers: [UserRegisteredListener],
  exports: [EventEmitterModule],
})
export class EventsModule {}
