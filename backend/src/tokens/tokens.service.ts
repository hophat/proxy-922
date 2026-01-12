import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from './tokens.entity';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(Token)
    private tokensRepository: Repository<Token>,
  ) {}

  async createToken(token: string, userId: string, expiredAt: Date): Promise<Token> {
    const tokenRecord = this.tokensRepository.create({
      token,
      userId,
      expiredAt,
    });
    return this.tokensRepository.save(tokenRecord);
  }

  async findByToken(token: string): Promise<Token | null> {
    return this.tokensRepository.findOne({ where: { token } });
  }

  async deleteToken(token: string): Promise<void> {
    await this.tokensRepository.delete({ token });
  }

  async deleteExpiredTokens(): Promise<void> {
    await this.tokensRepository
      .createQueryBuilder()
      .delete()
      .where('expired_at < :now', { now: new Date() })
      .execute();
  }
}

