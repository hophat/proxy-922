import { Controller, Get, Post, Put, Body, Param, UseGuards, Headers, Delete, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ProxiesService } from '../proxies/proxies.service';
import { HealthService } from '../health/health.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { ProxyStatus } from '../proxies/proxies.entity';
import { GatewaysService, CreateGatewayDto } from '../gateways/gateways.service';
import { GatewayStatus } from '../gateways/gateways.entity';
import { Socks5UpstreamService, CreateUpstreamDto } from '../socks5-upstream/socks5-upstream.service';
import { UpstreamStatus } from '../socks5-upstream/socks5-upstream.entity';
import { PurchasesService } from '../purchases/purchases.service';
import { UserProxyPurchase, PurchaseStatus } from '../purchases/user-proxy-purchase.entity';
import { PaymentsService } from '../payments/payments.service';
import { PaymentOrder, PaymentOrderStatus } from '../payments/payment-order.entity';
import { PortMappingsService } from '../port-mappings/port-mappings.service';
import { PortMapping, PortMappingStatus } from '../port-mappings/port-mappings.entity';
import { Gateway } from '../gateways/gateways.entity';
import { GatewayPort, GatewayPortStatus } from '../gateway-ports/gateway-ports.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard) // Require authentication for all admin endpoints
export class AdminController {
  constructor(
    private usersService: UsersService,
    private proxiesService: ProxiesService,
    private healthService: HealthService,
    private authService: AuthService,
    private gatewaysService: GatewaysService,
    private upstreamsService: Socks5UpstreamService,
    private purchasesService: PurchasesService,
    private paymentsService: PaymentsService,
    private portMappingsService: PortMappingsService,
    @InjectRepository(UserProxyPurchase)
    private purchaseRepository: Repository<UserProxyPurchase>,
    @InjectRepository(PaymentOrder)
    private paymentOrderRepository: Repository<PaymentOrder>,
    @InjectRepository(PortMapping)
    private portMappingRepository: Repository<PortMapping>,
    @InjectRepository(Gateway)
    private gatewayRepository: Repository<Gateway>,
    @InjectRepository(GatewayPort)
    private gatewayPortRepository: Repository<GatewayPort>,
  ) {}

  // Check if user is admin (simple check - can be enhanced)
  private async isAdmin(authorization: string): Promise<boolean> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return false;
    }
    const token = authorization.substring(7);
    const validation = await this.authService.validateToken(token);
    if (!validation.valid) {
      return false;
    }
    // For now, check if user email is admin (can be enhanced with role-based access)
    const user = await this.usersService.findById(validation.userId!);
    return user?.email === 'admin@gmail.com' || user?.email === 'admin@example.com' || user?.email?.endsWith('@admin.com');
  }

  @Get('users')
  async getAllUsers(@Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const users = await this.usersService.findAll();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      quotaTotal: u.quotaTotal,
      quotaUsed: u.quotaUsed,
      active: u.active,
      createdAt: u.createdAt,
    }));
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const user = await this.usersService.findById(id);
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      id: user.id,
      email: user.email,
      quotaTotal: user.quotaTotal,
      quotaUsed: user.quotaUsed,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Put('users/:id/quota')
  async updateQuota(
    @Param('id') id: string,
    @Body() body: { quotaTotal: number },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    if (body.quotaTotal < 0) {
      return { error: 'Quota must be non-negative' };
    }
    await this.usersService.updateQuotaTotal(id, body.quotaTotal);
    return { success: true, message: 'Quota updated successfully' };
  }

  @Put('users/:id/active')
  async updateActive(
    @Param('id') id: string,
    @Body() body: { active: boolean },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    await this.usersService.updateActive(id, body.active);
    return { success: true, message: 'User status updated successfully' };
  }

  @Post('users/:id/reset-quota')
  async resetQuota(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    await this.usersService.resetQuotaUsed(id);
    return { success: true, message: 'Quota usage reset successfully' };
  }

  @Get('stats')
  async getStats(@Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const users = await this.usersService.findAll();
    const proxies = await this.proxiesService.findAll();
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.active).length;
    const totalQuota = users.reduce((sum, u) => sum + u.quotaTotal, 0);
    const totalUsed = users.reduce((sum, u) => sum + u.quotaUsed, 0);
    const totalProxies = proxies.length;
    const activeProxies = proxies.filter((p) => p.status === ProxyStatus.ACTIVE).length;
    const deadProxies = proxies.filter((p) => p.status === ProxyStatus.DEAD).length;
    const disabledProxies = proxies.filter((p) => p.status === ProxyStatus.DISABLED).length;
    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalQuota,
      totalUsed,
      totalRemaining: totalQuota - totalUsed,
      totalProxies,
      activeProxies,
      deadProxies,
      disabledProxies,
    };
  }

  // Proxy Management Endpoints
  @Get('proxies')
  async getAllProxies(@Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const proxies = await this.proxiesService.findAll();
    return proxies.map((p) => ({
      id: p.id,
      host: p.host,
      port: p.port,
      username: p.username,
      status: p.status,
      lastCheck: p.lastCheck,
      consecutiveFailures: p.consecutiveFailures,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  @Get('proxies/:id')
  async getProxy(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const proxy = await this.proxiesService.findById(id);
    return {
      id: proxy.id,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username,
      status: proxy.status,
      lastCheck: proxy.lastCheck,
      consecutiveFailures: proxy.consecutiveFailures,
      createdAt: proxy.createdAt,
      updatedAt: proxy.updatedAt,
    };
  }

  @Put('proxies/:id/status')
  async updateProxyStatus(
    @Param('id') id: string,
    @Body() body: { status: ProxyStatus },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    await this.proxiesService.updateStatus(id, body.status);
    return { success: true, message: 'Proxy status updated successfully' };
  }

  @Delete('proxies/:id')
  async deleteProxy(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    await this.proxiesService.delete(id);
    return { success: true, message: 'Proxy deleted successfully' };
  }

  @Post('proxies/:id/check-health')
  async checkProxyHealth(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const result = await this.healthService.checkProxy(id);
    return result;
  }

  @Post('proxies/check-health-all')
  async checkAllProxiesHealth(@Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const result = await this.healthService.checkAllProxies();
    return { success: true, ...result };
  }

  @Post('proxies/:id/activate')
  async activateProxy(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    // Use updateStatus which already resets consecutiveFailures when status is ACTIVE
    await this.proxiesService.updateStatus(id, ProxyStatus.ACTIVE);
    return { success: true, message: 'Proxy activated successfully' };
  }

  @Post('proxies/import')
  async importProxies(
    @Body() body: { content: string },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    if (!body.content || !body.content.trim()) {
      return { error: 'Content is required' };
    }
    const result = await this.proxiesService.importFromFile(body.content);
    return {
      success: true,
      imported: result.imported,
      errors: result.errors,
      message: `Imported ${result.imported} proxies${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`,
    };
  }

  // ============ Gateways Management ============
  @Get('gateways')
  async getAllGateways(@Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const gateways = await this.gatewaysService.findAll();
    const result = [];
    for (const gateway of gateways) {
      const availablePortCount = await this.gatewaysService.getAvailablePortCount(gateway.id);
      result.push({
        id: gateway.id,
        ip: gateway.ip,
        portRangeStart: gateway.portRangeStart,
        portRangeEnd: gateway.portRangeEnd,
        status: gateway.status,
        availablePortCount,
        createdAt: gateway.createdAt,
        updatedAt: gateway.updatedAt,
      });
    }
    return result;
  }

  @Get('gateways/:id')
  async getGateway(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const gateway = await this.gatewaysService.findById(id);
    const availablePortCount = await this.gatewaysService.getAvailablePortCount(gateway.id);
    return {
      id: gateway.id,
      ip: gateway.ip,
      portRangeStart: gateway.portRangeStart,
      portRangeEnd: gateway.portRangeEnd,
      status: gateway.status,
      availablePortCount,
      createdAt: gateway.createdAt,
      updatedAt: gateway.updatedAt,
    };
  }

  @Post('gateways')
  async createGateway(
    @Body() body: CreateGatewayDto,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const gateway = await this.gatewaysService.create(body);
    return {
      id: gateway.id,
      ip: gateway.ip,
      portRangeStart: gateway.portRangeStart,
      portRangeEnd: gateway.portRangeEnd,
      status: gateway.status,
      createdAt: gateway.createdAt,
    };
  }

  @Put('gateways/:id')
  async updateGateway(
    @Param('id') id: string,
    @Body() body: Partial<CreateGatewayDto>,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const gateway = await this.gatewayRepository.findOne({ where: { id } });
    if (!gateway) {
      return { error: 'Gateway not found' };
    }
    if (body.ip) gateway.ip = body.ip;
    if (body.portRangeStart !== undefined) gateway.portRangeStart = body.portRangeStart;
    if (body.portRangeEnd !== undefined) gateway.portRangeEnd = body.portRangeEnd;
    await this.gatewayRepository.save(gateway);
    return {
      id: gateway.id,
      ip: gateway.ip,
      portRangeStart: gateway.portRangeStart,
      portRangeEnd: gateway.portRangeEnd,
      status: gateway.status,
      updatedAt: gateway.updatedAt,
    };
  }

  @Put('gateways/:id/status')
  async updateGatewayStatus(
    @Param('id') id: string,
    @Body() body: { status: GatewayStatus },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const gateway = await this.gatewayRepository.findOne({ where: { id } });
    if (!gateway) {
      return { error: 'Gateway not found' };
    }
    gateway.status = body.status;
    await this.gatewayRepository.save(gateway);
    return {
      id: gateway.id,
      status: gateway.status,
      updatedAt: gateway.updatedAt,
    };
  }

  @Delete('gateways/:id')
  async deleteGateway(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const gateway = await this.gatewayRepository.findOne({ where: { id } });
    if (!gateway) {
      return { error: 'Gateway not found' };
    }
    await this.gatewayRepository.remove(gateway);
    return { success: true, message: 'Gateway deleted successfully' };
  }

  // ============ Upstreams Management ============
  @Get('upstreams')
  async getAllUpstreams(
    @Query('status') status: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    let upstreams = await this.upstreamsService.findAll();
    
    // Filter by status if provided
    if (status && Object.values(UpstreamStatus).includes(status as UpstreamStatus)) {
      upstreams = upstreams.filter((u) => u.status === status);
    }

    // Simple pagination
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedUpstreams = upstreams.slice(start, end);

    return {
      data: paginatedUpstreams.map((u) => ({
        id: u.id,
        host: u.host,
        port: u.port,
        username: u.username,
        ping: u.ping,
        country: u.country,
        state: u.state,
        city: u.city,
        isp: u.isp,
        status: u.status,
        lastCheck: u.lastCheck,
        consecutiveFailures: u.consecutiveFailures,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total: upstreams.length,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('upstreams/:id')
  async getUpstream(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const upstream = await this.upstreamsService.findById(id);
    return {
      id: upstream.id,
      host: upstream.host,
      port: upstream.port,
      username: upstream.username,
      ping: upstream.ping,
      country: upstream.country,
      state: upstream.state,
      city: upstream.city,
      zip: upstream.zip,
      isp: upstream.isp,
      status: upstream.status,
      lastCheck: upstream.lastCheck,
      consecutiveFailures: upstream.consecutiveFailures,
      createdAt: upstream.createdAt,
      updatedAt: upstream.updatedAt,
    };
  }

  @Post('upstreams')
  async createUpstream(
    @Body() body: CreateUpstreamDto,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const upstream = await this.upstreamsService.create(body);
    return {
      id: upstream.id,
      host: upstream.host,
      port: upstream.port,
      username: upstream.username,
      status: upstream.status,
      createdAt: upstream.createdAt,
    };
  }

  @Post('upstreams/import')
  async importUpstreams(
    @Body() body: { content: string },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const result = await this.upstreamsService.importFromFile(body.content);
    return {
      success: true,
      imported: result.imported,
      errors: result.errors,
    };
  }

  @Put('upstreams/:id')
  async updateUpstream(
    @Param('id') id: string,
    @Body() body: Partial<CreateUpstreamDto>,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const upstream = await this.upstreamsService.update(id, body);
    return {
      id: upstream.id,
      host: upstream.host,
      port: upstream.port,
      username: upstream.username,
      status: upstream.status,
      updatedAt: upstream.updatedAt,
    };
  }

  @Put('upstreams/:id/status')
  async updateUpstreamStatus(
    @Param('id') id: string,
    @Body() body: { status: UpstreamStatus },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const upstream = await this.upstreamsService.updateStatus(id, body.status);
    return {
      id: upstream.id,
      status: upstream.status,
      updatedAt: upstream.updatedAt,
    };
  }

  @Post('upstreams/:id/check-geo')
  async checkUpstreamGeo(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    await this.upstreamsService.updateGeoInfo(id);
    const upstream = await this.upstreamsService.findById(id);
    return {
      success: true,
      geoInfo: {
        country: upstream.country,
        state: upstream.state,
        city: upstream.city,
        zip: upstream.zip,
        isp: upstream.isp,
      },
    };
  }

  @Post('upstreams/check-geo-all')
  async checkAllUpstreamsGeo(@Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const result = await this.upstreamsService.updateAllGeoInfo();
    return {
      success: true,
      ...result,
    };
  }

  @Delete('upstreams/:id')
  async deleteUpstream(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    await this.upstreamsService.delete(id);
    return { success: true, message: 'Upstream deleted successfully' };
  }

  // ============ Purchases Management ============
  @Get('purchases')
  async getAllPurchases(
    @Query('userId') userId: string,
    @Query('status') status: string,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const queryBuilder = this.purchaseRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.user', 'user')
      .leftJoinAndSelect('purchase.gateway', 'gateway')
      .leftJoinAndSelect('purchase.port', 'port')
      .leftJoinAndSelect('purchase.mapping', 'mapping');

    if (userId) {
      queryBuilder.where('purchase.userId = :userId', { userId });
    }

    if (status && Object.values(PurchaseStatus).includes(status as PurchaseStatus)) {
      if (userId) {
        queryBuilder.andWhere('purchase.status = :status', { status });
      } else {
        queryBuilder.where('purchase.status = :status', { status });
      }
    }

    queryBuilder.orderBy('purchase.createdAt', 'DESC');

    const purchases = await queryBuilder.getMany();

    return purchases.map((p) => ({
      id: p.id,
      userId: p.userId,
      userEmail: p.user?.email,
      gatewayId: p.gatewayId,
      gatewayIp: p.gateway?.ip,
      portId: p.portId,
      port: p.port?.port,
      mappingId: p.mappingId,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      duration: p.duration,
      price: Number(p.price),
      status: p.status,
      gatewayUsername: p.gatewayUsername,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  @Get('purchases/:id')
  async getPurchase(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['user', 'gateway', 'port', 'mapping'],
    });

    if (!purchase) {
      return { error: 'Purchase not found' };
    }

    return {
      id: purchase.id,
      userId: purchase.userId,
      userEmail: purchase.user?.email,
      gatewayId: purchase.gatewayId,
      gatewayIp: purchase.gateway?.ip,
      portId: purchase.portId,
      port: purchase.port?.port,
      mappingId: purchase.mappingId,
      purchasedAt: purchase.purchasedAt,
      expiresAt: purchase.expiresAt,
      duration: purchase.duration,
      price: Number(purchase.price),
      status: purchase.status,
      gatewayUsername: purchase.gatewayUsername,
      gatewayPassword: purchase.gatewayPassword,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
    };
  }

  @Put('purchases/:id/status')
  async updatePurchaseStatus(
    @Param('id') id: string,
    @Body() body: { status: PurchaseStatus },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const purchase = await this.purchaseRepository.findOne({ where: { id } });
    if (!purchase) {
      return { error: 'Purchase not found' };
    }
    purchase.status = body.status;
    await this.purchaseRepository.save(purchase);
    return {
      id: purchase.id,
      status: purchase.status,
      updatedAt: purchase.updatedAt,
    };
  }

  @Post('purchases/:id/expire')
  async expirePurchase(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['mapping', 'port', 'mapping.upstream'],
    });

    if (!purchase) {
      return { error: 'Purchase not found' };
    }

    purchase.status = PurchaseStatus.EXPIRED;
    await this.purchaseRepository.save(purchase);

    if (purchase.mapping) {
      purchase.mapping.status = PortMappingStatus.EXPIRED;
      await this.portMappingRepository.save(purchase.mapping);
    }

    if (purchase.port) {
      purchase.port.status = GatewayPortStatus.AVAILABLE;
      await this.gatewayPortRepository.save(purchase.port);
    }

    if (purchase.mapping?.upstream) {
      purchase.mapping.upstream.status = UpstreamStatus.AVAILABLE;
      await this.upstreamsService.updateStatus(purchase.mapping.upstream.id, UpstreamStatus.AVAILABLE);
    }

    return { success: true, message: 'Purchase expired successfully' };
  }

  // ============ Payments Management ============
  @Get('payments')
  async getAllPayments(
    @Query('userId') userId: string,
    @Query('status') status: string,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const queryBuilder = this.paymentOrderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user');

    if (userId) {
      queryBuilder.where('order.userId = :userId', { userId });
    }

    if (status && Object.values(PaymentOrderStatus).includes(status as PaymentOrderStatus)) {
      if (userId) {
        queryBuilder.andWhere('order.status = :status', { status });
      } else {
        queryBuilder.where('order.status = :status', { status });
      }
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');

    const orders = await queryBuilder.getMany();

    return orders.map((o) => ({
      id: o.id,
      orderCode: o.orderCode,
      userId: o.userId,
      userEmail: o.user?.email,
      amount: Number(o.amount),
      status: o.status,
      purchaseType: o.purchaseType,
      purchaseData: o.purchaseData,
      vaNumber: o.vaNumber,
      qrCodeUrl: o.qrCodeUrl,
      expiredAt: o.expiredAt,
      paidAt: o.paidAt,
      sepayTransactionId: o.sepayTransactionId,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  @Get('payments/:id')
  async getPayment(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const order = await this.paymentOrderRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!order) {
      return { error: 'Payment order not found' };
    }

    return {
      id: order.id,
      orderCode: order.orderCode,
      userId: order.userId,
      userEmail: order.user?.email,
      amount: Number(order.amount),
      status: order.status,
      purchaseType: order.purchaseType,
      purchaseData: order.purchaseData,
      vaNumber: order.vaNumber,
      qrCodeUrl: order.qrCodeUrl,
      expiredAt: order.expiredAt,
      paidAt: order.paidAt,
      sepayTransactionId: order.sepayTransactionId,
      sepayOrderId: order.sepayOrderId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  @Put('payments/:id/status')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { status: PaymentOrderStatus },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const order = await this.paymentOrderRepository.findOne({ where: { id } });
    if (!order) {
      return { error: 'Payment order not found' };
    }
    order.status = body.status;
    if (body.status === PaymentOrderStatus.PAID && !order.paidAt) {
      order.paidAt = new Date();
    }
    await this.paymentOrderRepository.save(order);
    return {
      id: order.id,
      status: order.status,
      paidAt: order.paidAt,
      updatedAt: order.updatedAt,
    };
  }

  // ============ Port Mappings Management ============
  @Get('port-mappings')
  async getAllPortMappings(
    @Query('userId') userId: string,
    @Query('gatewayId') gatewayId: string,
    @Query('status') status: string,
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const queryBuilder = this.portMappingRepository
      .createQueryBuilder('mapping')
      .leftJoinAndSelect('mapping.user', 'user')
      .leftJoinAndSelect('mapping.gateway', 'gateway')
      .leftJoinAndSelect('mapping.upstream', 'upstream')
      .leftJoinAndSelect('mapping.gatewayPort', 'port');

    if (userId) {
      queryBuilder.where('mapping.userId = :userId', { userId });
    }

    if (gatewayId) {
      if (userId) {
        queryBuilder.andWhere('mapping.gatewayId = :gatewayId', { gatewayId });
      } else {
        queryBuilder.where('mapping.gatewayId = :gatewayId', { gatewayId });
      }
    }

    if (status && Object.values(PortMappingStatus).includes(status as PortMappingStatus)) {
      const whereKey = userId || gatewayId ? 'andWhere' : 'where';
      queryBuilder[whereKey]('mapping.status = :status', { status });
    }

    queryBuilder.orderBy('mapping.createdAt', 'DESC');

    const mappings = await queryBuilder.getMany();

    return mappings.map((m) => ({
      id: m.id,
      userId: m.userId,
      userEmail: m.user?.email,
      gatewayId: m.gatewayId,
      gatewayIp: m.gateway?.ip,
      portId: m.portId,
      port: m.port,
      upstreamId: m.upstreamId,
      upstreamHost: m.upstream?.host,
      upstreamPort: m.upstream?.port,
      assignedAt: m.assignedAt,
      expiresAt: m.expiresAt,
      status: m.status,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));
  }

  @Get('port-mappings/:id')
  async getPortMapping(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const mapping = await this.portMappingRepository.findOne({
      where: { id },
      relations: ['user', 'gateway', 'upstream', 'gatewayPort'],
    });

    if (!mapping) {
      return { error: 'Port mapping not found' };
    }

    return {
      id: mapping.id,
      userId: mapping.userId,
      userEmail: mapping.user?.email,
      gatewayId: mapping.gatewayId,
      gatewayIp: mapping.gateway?.ip,
      portId: mapping.portId,
      port: mapping.port,
      upstreamId: mapping.upstreamId,
      upstreamHost: mapping.upstream?.host,
      upstreamPort: mapping.upstream?.port,
      assignedAt: mapping.assignedAt,
      expiresAt: mapping.expiresAt,
      status: mapping.status,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    };
  }

  @Put('port-mappings/:id/status')
  async updatePortMappingStatus(
    @Param('id') id: string,
    @Body() body: { status: PortMappingStatus },
    @Headers('authorization') authorization: string,
  ) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const mapping = await this.portMappingRepository.findOne({ where: { id } });
    if (!mapping) {
      return { error: 'Port mapping not found' };
    }
    mapping.status = body.status;
    await this.portMappingRepository.save(mapping);
    return {
      id: mapping.id,
      status: mapping.status,
      updatedAt: mapping.updatedAt,
    };
  }

  @Post('port-mappings/:id/release')
  async releasePortMapping(@Param('id') id: string, @Headers('authorization') authorization: string) {
    if (!(await this.isAdmin(authorization))) {
      return { error: 'Unauthorized: Admin access required' };
    }
    const mapping = await this.portMappingRepository.findOne({
      where: { id },
      relations: ['gatewayPort', 'upstream'],
    });

    if (!mapping) {
      return { error: 'Port mapping not found' };
    }

    mapping.status = PortMappingStatus.RELEASED;
    await this.portMappingRepository.save(mapping);

    // Release port
    if (mapping.gatewayPort) {
      mapping.gatewayPort.status = GatewayPortStatus.AVAILABLE;
      await this.gatewayPortRepository.save(mapping.gatewayPort);
    }

    // Release upstream
    if (mapping.upstream) {
      mapping.upstream.status = UpstreamStatus.AVAILABLE;
      await this.upstreamsService.updateStatus(mapping.upstream.id, UpstreamStatus.AVAILABLE);
    }

    // Update related purchase status if exists
    const purchase = await this.purchaseRepository.findOne({
      where: { mappingId: mapping.id },
    });
    if (purchase && purchase.status === PurchaseStatus.ACTIVE) {
      purchase.status = PurchaseStatus.CANCELLED;
      await this.purchaseRepository.save(purchase);
    }

    return { success: true, message: 'Port mapping released successfully' };
  }
}

