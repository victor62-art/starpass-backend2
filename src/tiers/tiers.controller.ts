import { Controller, Get, Post, Param, Query, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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

  @Post(':id/content/unlock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock content for a pass holder — returns a signed temporary URL token' })
  @ApiResponse({ status: 201, description: 'Content unlock token issued' })
  @ApiResponse({ status: 403, description: 'No valid pass for this tier' })
  @ApiResponse({ status: 404, description: 'Tier not found' })
  unlock(@Param('id') id: string, @Request() req: any) {
    return this.tiersService.unlockContent(id, req.user.address);
  }

  @Get(':id/content/verify')
  @ApiOperation({ summary: 'Verify a content unlock token' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({ status: 200, description: 'Token validity result' })
  verify(@Param('id') id: string, @Query('token') token: string) {
    return this.tiersService.verifyContentToken(id, token);
  }
}
