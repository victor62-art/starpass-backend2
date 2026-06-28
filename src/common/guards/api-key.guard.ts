import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CreatorsService } from '../../creators/creators.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private creatorsService: CreatorsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];

    if (!apiKeyHeader) {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKey = await this.creatorsService.validateApiKey(apiKeyHeader);
    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKey = apiKey;
    return true;
  }
}
