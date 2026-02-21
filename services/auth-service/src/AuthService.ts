import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { BaseService } from '@insurance/shared';
import { User } from './entities/User';
import { v4 as uuidv4 } from 'uuid';

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
  roles?: string[];
}

interface LoginRequest {
  username: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  roles: string[];
}

export class AuthService extends BaseService {
  private userRepo: Repository<User>;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  getEntities(): any[] {
    return [User];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.userRepo = this.dataSource.getRepository(User);
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  private generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  private verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  setupRoutes(): void {
    // POST /auth/register
    this.app.post('/auth/register', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as RegisterRequest;

        if (!body.email || !body.username || !body.password || !body.firstName || !body.lastName) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'email, username, password, firstName, lastName are required' },
            correlationId,
          });
        }

        const existingUser = await this.userRepo.findOne({
          where: [{ email: body.email }, { username: body.username }],
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            error: { code: 'DUPLICATE_USER', message: 'User with this email or username already exists' },
            correlationId,
          });
        }

        const passwordHash = await bcrypt.hash(body.password, 10);

        const user = this.userRepo.create({
          userId: uuidv4(),
          email: body.email,
          username: body.username,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          department: body.department || null,
          roles: body.roles || ['user'],
          isActive: true,
          lastLoginAt: null,
        });

        await this.userRepo.save(user);

        this.logger.info('User registered', { userId: user.userId, username: user.username, correlationId });

        return res.status(201).json({
          success: true,
          data: {
            userId: user.userId,
            email: user.email,
            username: user.username,
            roles: user.roles,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to register user', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to register user' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // POST /auth/login
    this.app.post('/auth/login', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as LoginRequest;

        if (!body.username || !body.password) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'username and password are required' },
            correlationId,
          });
        }

        const user = await this.userRepo.findOne({ where: { username: body.username } });

        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
            correlationId,
          });
        }

        const isPasswordValid = await bcrypt.compare(body.password, user.passwordHash);

        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
            correlationId,
          });
        }

        user.lastLoginAt = new Date();
        await this.userRepo.save(user);

        const token = this.generateToken({
          userId: user.userId,
          email: user.email,
          username: user.username,
          roles: user.roles,
        });

        this.logger.info('User logged in', { userId: user.userId, username: user.username, correlationId });

        return res.json({
          success: true,
          data: {
            token,
            user: {
              userId: user.userId,
              email: user.email,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              roles: user.roles,
              department: user.department,
            },
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to login', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to login' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /auth/me - Get current user
    this.app.get('/auth/me', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authorization token required' },
            correlationId,
          });
        }

        const token = authHeader.substring(7);
        const payload = this.verifyToken(token);

        const user = await this.userRepo.findOne({ where: { userId: payload.userId } });

        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
            correlationId,
          });
        }

        return res.json({
          success: true,
          data: {
            userId: user.userId,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            department: user.department,
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to get current user', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /auth/users - List users (admin only)
    this.app.get('/auth/users', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { limit = '50', offset = '0' } = req.query;

        const [users, total] = await this.userRepo.findAndCount({
          where: { isActive: true },
          take: parseInt(limit as string, 10),
          skip: parseInt(offset as string, 10),
          order: { createdAt: 'DESC' },
        });

        return res.json({
          success: true,
          data: users.map(u => ({
            userId: u.userId,
            email: u.email,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            roles: u.roles,
            department: u.department,
            lastLoginAt: u.lastLoginAt,
          })),
          pagination: {
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to list users', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
          correlationId: (req as any).correlationId,
        });
      }
    });
  }
}
