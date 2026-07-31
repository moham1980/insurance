import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PartnerCertificate, CertStatus } from './entities/PartnerCertificate';

export interface RegisterCertDto {
  partnerId: string;
  certSubject: string;
  certSerial: string;
  publicCertPem: string;
  issuer: string;
  validFrom: Date;
  expiresAt: Date;
}

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(PartnerCertificate)
    private readonly repo: Repository<PartnerCertificate>,
  ) {}

  async registerCertificate(dto: RegisterCertDto): Promise<PartnerCertificate> {
    const cert = this.repo.create({
      certId: uuidv4(),
      partnerId: dto.partnerId,
      certSubject: dto.certSubject,
      certSerial: dto.certSerial,
      publicCertPem: dto.publicCertPem,
      issuer: dto.issuer,
      status: 'active',
      validFrom: dto.validFrom,
      expiresAt: dto.expiresAt,
    });
    return this.repo.save(cert);
  }

  async listCertificates(partnerId: string): Promise<PartnerCertificate[]> {
    return this.repo.find({ where: { partnerId }, order: { createdAt: 'DESC' } });
  }

  async getActiveCertificate(partnerId: string): Promise<PartnerCertificate | null> {
    return this.repo.findOne({ where: { partnerId, status: 'active' }, order: { createdAt: 'DESC' } });
  }

  async rotateCertificate(oldCertId: string, newCertDto: RegisterCertDto): Promise<PartnerCertificate> {
    const oldCert = await this.repo.findOne({ where: { certId: oldCertId } });
    if (!oldCert) throw new NotFoundException('Old certificate not found');

    oldCert.status = 'rotated';
    oldCert.rotatedAt = new Date();
    oldCert.rotatedFromCertId = null;
    await this.repo.save(oldCert);

    const newCert = this.repo.create({
      certId: uuidv4(),
      partnerId: newCertDto.partnerId,
      certSubject: newCertDto.certSubject,
      certSerial: newCertDto.certSerial,
      publicCertPem: newCertDto.publicCertPem,
      issuer: newCertDto.issuer,
      status: 'active',
      validFrom: newCertDto.validFrom,
      expiresAt: newCertDto.expiresAt,
      rotatedFromCertId: oldCertId,
    });
    return this.repo.save(newCert);
  }

  async revokeCertificate(certId: string): Promise<PartnerCertificate> {
    const cert = await this.repo.findOne({ where: { certId } });
    if (!cert) throw new NotFoundException('Certificate not found');
    cert.status = 'revoked';
    return this.repo.save(cert);
  }

  async getExpiringCertificates(daysAhead: number = 30): Promise<PartnerCertificate[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);
    return this.repo.find({
      where: { status: 'active', expiresAt: LessThan(threshold) },
      order: { expiresAt: 'ASC' },
    });
  }

  async checkAndMarkExpired(): Promise<number> {
    const now = new Date();
    const expired = await this.repo.find({
      where: { status: 'active', expiresAt: LessThan(now) },
    });
    for (const cert of expired) {
      cert.status = 'expired';
      await this.repo.save(cert);
      this.logger.warn(`Certificate ${cert.certId} for partner ${cert.partnerId} has expired`);
    }
    return expired.length;
  }

  async validateCertificate(certSubject: string, certSerial: string): Promise<PartnerCertificate | null> {
    const cert = await this.repo.findOne({
      where: { certSubject, certSerial, status: 'active' },
    });
    if (!cert) return null;
    const now = new Date();
    if (now > cert.expiresAt) {
      cert.status = 'expired';
      await this.repo.save(cert);
      return null;
    }
    return cert;
  }
}
