import { Injectable, ExecutionContext, CallHandler } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class XCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    return `${request.method}:${request.route?.path || request.url}:${JSON.stringify(request.params)}`;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const method = request.method;

    if (method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.trackBy(context);
    if (!cacheKey) {
      return next.handle();
    }

    try {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached !== undefined) {
        response.setHeader('X-Cache', 'HIT');
        return new Observable((subscriber) => {
          subscriber.next(cached);
          subscriber.complete();
        });
      }
    } catch (e) {
      // cache miss or error, continue to handler
    }

    response.setHeader('X-Cache', 'MISS');
    return next.handle().pipe(
      tap(async (data) => {
        try {
          await this.cacheManager.set(cacheKey, data);
        } catch (e) {
          // ignore cache set errors
        }
      }),
    );
  }
}