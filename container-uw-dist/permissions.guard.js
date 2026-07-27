"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const permissions_decorator_1 = require("./permissions.decorator");
const permissions_1 = require("./permissions");
let PermissionsGuard = class PermissionsGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const required = this.reflector.getAllAndOverride(permissions_decorator_1.REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) || [];
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            });
        }
        if (required.length === 0)
            return true;
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const perms = (0, permissions_1.permissionsForRoles)(roles);
        for (const r of required) {
            if (perms.includes(r))
                return true;
        }
        throw new common_1.ForbiddenException({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Missing required permission' },
        });
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
