import { Injectable, ConflictException, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DB } from '../../common/database/database.module';
import { users } from '../../common/database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private db: any,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await this.db.insert(users).values({ email, name, passwordHash }).returning();
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    };
  }

  async validateUser(userId: string) {
    const [user] = await this.db.select({
      id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl,
    }).from(users).where(eq(users.id, userId));
    return user || null;
  }
}
