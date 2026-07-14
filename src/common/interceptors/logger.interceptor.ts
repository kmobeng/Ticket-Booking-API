import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { finalize, Observable } from 'rxjs'; // Importing the tap operator from rxjs to perform side effects on the observable stream

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP'); // Creating a new instance of the Logger class with the context 'HTTP'

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const start = Date.now();

    return next.handle().pipe(
      finalize(() => {
        this.logger.log(
          `${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`,
        );
      }),
    );
  }
}
