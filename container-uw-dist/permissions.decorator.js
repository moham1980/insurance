"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRE_PERMISSIONS_KEY = void 0;
exports.RequirePermissions = RequirePermissions;
const common_1 = require("@nestjs/common");
exports.REQUIRE_PERMISSIONS_KEY = 'require_permissions';
function RequirePermissions(...permissions) {
    return (0, common_1.SetMetadata)(exports.REQUIRE_PERMISSIONS_KEY, permissions);
}
