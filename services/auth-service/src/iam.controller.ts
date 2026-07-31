import { Body, Controller, Get, Headers, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AccessAuditService } from './access-audit.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { getParentRoles, getChildRoles, getAllRolesWithInheritance } from './role-hierarchy';
import { checkSodViolations, checkActionSodViolation, getRoleAssignmentsWithSodWarnings } from './sod.rules';

@Controller('iam')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class IamController {
  constructor(private readonly accessAuditService: AccessAuditService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  /**
   * Get role hierarchy information
   */
  @Get('roles/hierarchy')
  @Permissions('roles:catalog')
  getRoleHierarchy(@Query('role') role?: string) {
    if (role) {
      return {
        role,
        parents: getParentRoles(role),
        children: getChildRoles(role),
        allRolesWithInheritance: getAllRolesWithInheritance(role),
      };
    }
    return { message: 'Provide a role parameter to see its hierarchy' };
  }

  /**
   * Check SoD violations for a set of roles
   */
  @Post('roles/sod-check')
  @Permissions('users:set_roles')
  checkSodViolations(@Body() body: { roles: string[] }) {
    const { violations, warnings } = checkSodViolations(body.roles || []);
    return {
      hasViolations: violations.length > 0,
      hasWarnings: warnings.length > 0,
      violations,
      warnings,
    };
  }

  /**
   * Check if a role assignment is allowed based on SoD rules
   */
  @Post('roles/validate-assignment')
  @Permissions('users:set_roles')
  validateRoleAssignment(@Body() body: { roles: string[] }) {
    return getRoleAssignmentsWithSodWarnings(body.roles || []);
  }

  /**
   * Get access audit logs for a user
   */
  @Get('audit/user/:userId')
  @Permissions('users:list')
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Query('organizationId') organizationId?: string,
    @Query('agreementId') agreementId?: string,
  ) {
    const result = await this.accessAuditService.getUserAccessLogs(userId, {
      limit: Math.min(parseInt(String(limit)), 100),
      offset: parseInt(String(offset)),
      organizationId,
      agreementId,
    });
    return result;
  }

  /**
   * Get access audit logs for a resource
   */
  @Get('audit/resource')
  @Permissions('policy:view')
  async getResourceAuditLogs(
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Query('organizationId') organizationId?: string,
    @Query('agreementId') agreementId?: string,
  ) {
    if (!resourceType || !resourceId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'resourceType and resourceId are required' } };
    }

    const result = await this.accessAuditService.getResourceAccessLogs(resourceType, resourceId, {
      limit: Math.min(parseInt(String(limit)), 100),
      offset: parseInt(String(offset)),
      organizationId,
      agreementId,
    });
    return result;
  }

  /**
   * Get denied access attempts
   */
  @Get('audit/denied')
  @Permissions('users:list')
  async getDeniedAccessAttempts(
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') organizationId?: string,
    @Query('agreementId') agreementId?: string,
  ) {
    const result = await this.accessAuditService.getDeniedAccessAttempts({
      limit: Math.min(parseInt(String(limit)), 100),
      offset: parseInt(String(offset)),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      organizationId,
      agreementId,
    });
    return result;
  }

  /**
   * Get access statistics
   */
  @Get('audit/stats')
  @Permissions('reporting:view')
  async getAccessStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('organizationId') organizationId?: string,
    @Query('agreementId') agreementId?: string,
  ) {
    const result = await this.accessAuditService.getAccessStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      organizationId,
      agreementId,
    });
    return result;
  }
}
