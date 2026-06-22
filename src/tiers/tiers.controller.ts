import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TiersService } from './tiers.service';

@ApiTags('tiers')
@Controller('tiers')
export class TiersController {
  constructor(private tiersService: TiersService) {}

  @Get()
  @ApiOperation({ summary: 'List tiers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'creatorId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Return paginated list of tiers' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('creatorId') creatorId?: string,
  ) {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }

    if (!Number.isInteger(limitNumber) || limitNumber < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }

    if (limitNumber > 100) {
      throw new BadRequestException('Limit cannot exceed 100');
    }

    return this.tiersService.findAll(pageNumber, limitNumber, creatorId);
  }

  @Get('creator/:address')
  @ApiOperation({ summary: 'Get all active tiers for a creator' })
  @ApiResponse({ status: 200, description: 'Return active tiers for the creator' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  findByCreator(@Param('address') address: string) {
    return this.tiersService.findByCreator(address);
  }

  @Get('creator/:address/:onChainId')
  @ApiOperation({ summary: 'Get a specific tier by on-chain ID' })
  @ApiResponse({ status: 200, description: 'Return tier profile' })
  @ApiResponse({ status: 404, description: 'Creator or tier not found' })
  findOne(
    @Param('address') address: string,
    @Param('onChainId', ParseIntPipe) onChainId: number,
  ) {
    return this.tiersService.findOne(address, onChainId);
  }
}
