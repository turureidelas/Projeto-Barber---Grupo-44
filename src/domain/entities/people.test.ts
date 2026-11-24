import { describe, expect, it } from 'vitest';
import { InvalidValueError } from '../errors/DomainError';
import { aWeekSchedule, at, ids, reais } from '../testing/builders';
import { CancellationPolicy } from '../value-objects/CancellationPolicy';
import { Email } from '../value-objects/Email';
import { Percentage } from '../value-objects/Percentage';
import { Phone } from '../value-objects/Phone';
import { TimeRange } from '../value-objects/TimeRange';
import { WorkSchedule } from '../value-objects/WorkSchedule';
import { Barbershop } from './Barbershop';
import { ANONYMIZED_CLIENT_NAME, Client } from './Client';
import { toId, type TimeBlockId, type UserId } from './ids';
import { Professional } from './Professional';
import { TimeBlock } from './TimeBlock';
import { User } from './User';

describe('Professional', () => {
  const ricardo = Professional.create({
    id: ids.ricardo,
    barbershopId: ids.shop,
    name: ' Ricardo Almeida ',
    specialty: '  ',
    photoUrl: null,
    commission: Percentage.of(40),
    schedule: aWeekSchedule(),
    active: true,
  });

  it('normalizes text fields', () => {
    expect(ricardo.name).toBe('Ricardo Almeida');
    expect(ricardo.specialty).toBeNull();
  });

  it('rejects an empty name', () => {
    expect(() => ricardo.update({ name: '' })).toThrow(InvalidValueError);
  });

  it('calculates commission over the amount paid', () => {
    expect(ricardo.commissionOn(reais(45)).cents).toBe(1800);
    expect(ricardo.update({ commission: Percentage.of(50) }).commissionOn(reais(45)).cents).toBe(
      2250,
    );
  });

  it('changes schedule and activity immutably', () => {
    const changed = ricardo.changeSchedule(WorkSchedule.empty()).deactivate();
    expect(changed.schedule.workingDays()).toEqual([]);
    expect(changed.active).toBe(false);
    expect(changed.activate().active).toBe(true);
    expect(ricardo.schedule.workingDays()).toHaveLength(6);
  });
});

describe('Client', () => {
  const joao = Client.create({
    id: ids.client,
    barbershopId: ids.shop,
    name: 'João Pedro',
    phone: Phone.parse('(11) 98765-4321'),
    email: null,
    consent: null,
    createdAt: at('08:00'),
  });

  it('requires only name and phone', () => {
    expect(joao.email).toBeNull();
    expect(joao.hasConsent).toBe(false);
  });

  it('updates contact data', () => {
    const updated = joao.update({ email: Email.parse('joao@email.com') });
    expect(updated.email?.value).toBe('joao@email.com');
    expect(() => joao.update({ name: ' ' })).toThrow(InvalidValueError);
  });

  it('records and revokes LGPD consent', () => {
    const consented = joao.grantConsent({
      grantedAt: at('08:00'),
      termsVersion: ' v1 ',
      channel: 'PANEL',
    });
    expect(consented.hasConsent).toBe(true);
    expect(consented.consent?.termsVersion).toBe('v1');
    expect(consented.revokeConsent().hasConsent).toBe(false);
  });

  it('rejects consent without a terms version', () => {
    expect(() =>
      joao.grantConsent({ grantedAt: at('08:00'), termsVersion: '', channel: 'APP' }),
    ).toThrow(InvalidValueError);
  });

  it('requires a phone while the client is identifiable', () => {
    expect(() => Client.create({ ...joao.toProps(), phone: null })).toThrow(/phone/);
  });

  it('erases the personal data for good at the client request (LGPD)', () => {
    const consented = joao
      .update({ email: Email.parse('joao@email.com') })
      .grantConsent({ grantedAt: at('08:00'), termsVersion: 'v1', channel: 'APP' });
    const anonymized = consented.anonymize(at('09:00'));

    expect(anonymized.toProps()).toEqual({
      id: ids.client,
      barbershopId: ids.shop,
      name: ANONYMIZED_CLIENT_NAME,
      phone: null,
      email: null,
      consent: null,
      createdAt: at('08:00'),
      anonymizedAt: at('09:00'),
    });
    expect(anonymized.isAnonymized).toBe(true);
    expect(joao.isAnonymized).toBe(false);

    expect(() => anonymized.anonymize(at('10:00'))).toThrow(/anonymized/);
    expect(() => anonymized.update({ name: 'João' })).toThrow(/anonymized/);
    expect(() =>
      anonymized.grantConsent({ grantedAt: at('10:00'), termsVersion: 'v1', channel: 'APP' }),
    ).toThrow(/anonymized/);
    expect(() =>
      Client.create({ ...anonymized.toProps(), phone: Phone.parse('(11) 98765-4321') }),
    ).toThrow(/no contact data/);
  });
});

describe('User', () => {
  const base = {
    id: toId<UserId>('user-1'),
    barbershopId: ids.shop,
    name: ' Ricardo ',
    email: Email.parse('ricardo@novaera.com.br'),
  };

  it('lets an owner work as a professional or not', () => {
    expect(User.create({ ...base, role: 'OWNER', professionalId: ids.ricardo }).name).toBe(
      'Ricardo',
    );
    expect(User.create({ ...base, role: 'OWNER', professionalId: null }).professionalId).toBeNull();
  });

  it('requires professionals to be linked to a professional profile', () => {
    expect(() => User.create({ ...base, role: 'PROFESSIONAL', professionalId: null })).toThrow(
      InvalidValueError,
    );
    expect(User.create({ ...base, role: 'PROFESSIONAL', professionalId: ids.bruno }).role).toBe(
      'PROFESSIONAL',
    );
  });

  it('does not let receptionists have a professional profile', () => {
    expect(() => User.create({ ...base, role: 'RECEPTIONIST', professionalId: ids.bruno })).toThrow(
      InvalidValueError,
    );
  });

  it('links a client account to its client record, and only client accounts', () => {
    const client = User.create({
      ...base,
      role: 'CLIENT',
      professionalId: null,
      clientId: ids.client,
    });
    expect(client.clientId).toBe(ids.client);
    expect(client.isClient).toBe(true);
    expect(User.create({ ...base, role: 'OWNER', professionalId: null }).clientId).toBeNull();
    expect(User.create({ ...base, role: 'OWNER', professionalId: null }).isClient).toBe(false);

    expect(() => User.create({ ...base, role: 'CLIENT', professionalId: null })).toThrow(
      /client record/,
    );
    expect(() =>
      User.create({ ...base, role: 'CLIENT', professionalId: ids.bruno, clientId: ids.client }),
    ).toThrow(/professional profile/);
    expect(() =>
      User.create({ ...base, role: 'OWNER', professionalId: null, clientId: ids.client }),
    ).toThrow(/only client accounts/);
  });
});

describe('Barbershop', () => {
  const shop = Barbershop.create({
    id: ids.shop,
    name: 'Barbearia Nova Era',
    phone: Phone.parse('1133334444'),
    address: '   ',
    cancellationPolicy: CancellationPolicy.default(),
  });

  it('normalizes the optional address', () => {
    expect(shop.address).toBeNull();
    expect(shop.update({ address: ' Rua A, 10 ' }).address).toBe('Rua A, 10');
  });

  it('changes the cancellation policy', () => {
    const policy = CancellationPolicy.create({ minNoticeHours: 4, noShowToleranceMinutes: 10 });
    expect(shop.changeCancellationPolicy(policy).cancellationPolicy.minNoticeHours).toBe(4);
  });

  it('rejects an empty name', () => {
    expect(() => shop.update({ name: '' })).toThrow(InvalidValueError);
  });
});

describe('TimeBlock', () => {
  it('normalizes the optional reason', () => {
    const block = TimeBlock.create({
      id: toId<TimeBlockId>('block-1'),
      barbershopId: ids.shop,
      professionalId: ids.ricardo,
      range: TimeRange.create(at('15:00'), at('16:00')),
      reason: '  Médico ',
      createdBy: ids.owner,
      createdAt: at('08:00'),
    });
    expect(block.reason).toBe('Médico');
  });
});

describe('toId', () => {
  it('rejects empty IDs', () => {
    expect(() => toId<UserId>('  ')).toThrow(InvalidValueError);
  });
});
