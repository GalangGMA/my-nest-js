import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../constants/events.constants';
import type { UserRegisteredEvent } from '../interfaces/user-registered-event.interface';

@Injectable()
export class UserRegisteredListener {
  private readonly logger = new Logger(UserRegisteredListener.name);

  @OnEvent(DOMAIN_EVENTS.USER_REGISTERED)
  handle(event: UserRegisteredEvent): void {
    this.logger.log(
      `User registered event received for ${event.email} (${event.userId})`,
    );
  }
}
