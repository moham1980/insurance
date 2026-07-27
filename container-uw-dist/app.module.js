"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const permissions_guard_1 = require("./permissions.guard");
const underwriting_controller_1 = require("./underwriting.controller");
const health_controller_1 = require("./health.controller");
const underwriting_service_1 = require("./underwriting.service");
const UnderwritingRequest_1 = require("./entities/UnderwritingRequest");
const UnderwritingAppetite_1 = require("./entities/UnderwritingAppetite");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432', 10),
                username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'postgres',
                database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
                schema: process.env.DB_SCHEMA || 'public',
                entities: [UnderwritingRequest_1.UnderwritingRequest, UnderwritingAppetite_1.UnderwritingAppetite],
                synchronize: process.env.DB_SYNC === 'true',
            }),
            typeorm_1.TypeOrmModule.forFeature([UnderwritingRequest_1.UnderwritingRequest, UnderwritingAppetite_1.UnderwritingAppetite]),
        ],
        controllers: [underwriting_controller_1.UnderwritingController, health_controller_1.HealthController],
        providers: [underwriting_service_1.UnderwritingService, jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard, core_1.Reflector],
    })
], AppModule);
