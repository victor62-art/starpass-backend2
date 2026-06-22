import { Body, Controller, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TiersService } from './tiers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('tiers')
@Controller('tiers')
export class TiersController {
  constructor(private tiersService: TiersService) {}

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

  @Post('creator/:address/bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create up to 10 tiers for a creator (atomic)' })
  @ApiResponse({ status: 201, description: 'All tiers created' })
  @ApiResponse({ status: 400, description: 'More than 10 tiers or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  bulkCreate(
    @Param('address') address: string,
    @Body() body: {
      tiers: Array<{ name: string; description?: string; priceUsdc: string; durationDays: number; maxSupply?: number }>;
    },
    @Request() req: any,
  ) {
    return this.tiersService.bulkCreate(req.user.address, body.tiers);
  }
}
