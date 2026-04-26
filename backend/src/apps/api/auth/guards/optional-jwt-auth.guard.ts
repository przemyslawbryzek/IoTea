import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (err || info) {
      return null as TUser;
    }

    return user;
  }
}
