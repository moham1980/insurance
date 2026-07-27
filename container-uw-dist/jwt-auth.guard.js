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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
let JwtAuthGuard = class JwtAuthGuard {
    jwtSecret;
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request?.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authorization token required' },
            });
        }
        const token = authHeader.substring(7);
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.jwtSecret);
            request.user = payload;
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
            });
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], JwtAuthGuard);
