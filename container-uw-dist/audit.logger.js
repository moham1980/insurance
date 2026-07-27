"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = void 0;
const shared_1 = require("@insurance/shared");
exports.auditLogger = (0, shared_1.createLogger)({
    serviceName: 'underwriting-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
});
