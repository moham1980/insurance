import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/User';

interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  private generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
  }

  private verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  async register(params: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
    roles?: string[];
  }): Promise<{ user: User }> {
    const existingUser = await this.userRepo.findOne({
      where: [{ email: params.email }, { username: params.username }],
    });

    if (existingUser) {
      const err: any = new Error('User with this email or username already exists');
      err.code = 'DUPLICATE_USER';
      throw err;
    }

    const passwordHash = await bcrypt.hash(params.password, 10);

    const user = this.userRepo.create({
      userId: uuidv4(),
      email: params.email,
      username: params.username,
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      department: params.department || null,
      roles: params.roles || ['user'],
      isActive: true,
      lastLoginAt: null,
    });

    await this.userRepo.save(user);
    return { user };
  }

  async login(params: { username: string; password: string }): Promise<{ token: string; user: User }> {
    const user = await this.userRepo.findOne({ where: { username: params.username } });

    if (!user || !user.isActive) {
      const err: any = new Error('Invalid username or password');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) {
      const err: any = new Error('Invalid username or password');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const token = this.generateToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
      roles: user.roles,
    });

    return { token, user };
  }

  async me(authHeader: string | undefined): Promise<User> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err: any = new Error('Authorization token required');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const token = authHeader.substring(7);
    const payload = this.verifyToken(token);

    const user = await this.userRepo.findOne({ where: { userId: payload.userId } });
    if (!user || !user.isActive) {
      const err: any = new Error('User not found or inactive');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    return user;
  }

  async listUsers(params: { limit: number; offset: number }): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepo.findAndCount({
      where: { isActive: true },
      take: params.limit,
      skip: params.offset,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }
}
