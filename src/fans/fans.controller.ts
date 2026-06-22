import { Controller, Delete, ForbiddenException, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FansService } from './fans.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('fans')
@Controller('fans')
export class FansController {
  constructor(private fansService: FansService) {}

  @Get(':address')
  @ApiOperation({ summary: 'Get fan profile by Stellar address' })
  @ApiResponse({ status: 200, description: 'Return fan profile' })
  @ApiResponse({ status: 404, description: 'Fan not found' })
  findOne(@Param('address') address: string) {
    return this.fansService.findByAddress(address);
  }

  @Get(':address/subscriptions')
  @ApiOperation({ summary: 'Get active subscriptions for a fan' })
  @ApiResponse({ status: 200, description: 'Return list of active subscriptions' })
  @ApiResponse({ status: 404, description: 'Fan not found' })
  getSubscriptions(@Param('address') address: string) {
    return this.fansService.getSubscriptions(address);
  }

  @Get(':address/favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List creators saved as favorites by a fan' })
  @ApiResponse({ status: 200, description: 'Return list of favorite creators' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Can only view your own favorites' })
  @ApiResponse({ status: 404, description: 'Fan not found' })
  getFavorites(@Param('address') address: string, @Request() req: any) {
    if (req.user?.address !== address) {
      throw new ForbiddenException('You can only view your own favorites');
    }
    return this.fansService.getFavorites(address);
  }

  @Post(':address/favorites/:creatorId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a creator to fan favorites' })
  @ApiResponse({ status: 201, description: 'Creator added to favorites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Can only manage your own favorites' })
  @ApiResponse({ status: 404, description: 'Fan or creator not found' })
  @ApiResponse({ status: 409, description: 'Already in favorites' })
  addFavorite(
    @Param('address') address: string,
    @Param('creatorId') creatorId: string,
    @Request() req: any,
  ) {
    if (req.user?.address !== address) {
      throw new ForbiddenException('You can only manage your own favorites');
    }
    return this.fansService.addFavorite(address, creatorId);
  }

  @Delete(':address/favorites/:creatorId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a creator from fan favorites' })
  @ApiResponse({ status: 200, description: 'Creator removed from favorites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Can only manage your own favorites' })
  removeFavorite(
    @Param('address') address: string,
    @Param('creatorId') creatorId: string,
    @Request() req: any,
  ) {
    if (req.user?.address !== address) {
      throw new ForbiddenException('You can only manage your own favorites');
    }
    return this.fansService.removeFavorite(address, creatorId);
  }

  @Get(':address/activity')
  @ApiOperation({ summary: 'Get activity feed for a fan in reverse chronological order' })
  @ApiQuery({ name: 'type', required: false, enum: ['pass_purchased', 'pass_expired'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Return activity events' })
  @ApiResponse({ status: 404, description: 'Fan not found' })
  getActivity(
    @Param('address') address: string,
    @Query('type') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.fansService.getActivity(address, type, +page, +limit);
  }
}
