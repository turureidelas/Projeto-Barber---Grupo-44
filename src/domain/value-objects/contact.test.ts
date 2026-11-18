import { describe, expect, it } from 'vitest';
import { InvalidValueError } from '../errors/DomainError';
import { Email } from './Email';
import { Phone } from './Phone';

describe('Phone', () => {
  it.each(['(11) 98765-4321', '11987654321', '+55 11 98765-4321', '55 (11) 98765 4321'])(
    'normalizes "%s" to digits',
    (input) => {
      expect(Phone.parse(input).digits).toBe('11987654321');
    },
  );

  it('formats and masks a mobile number', () => {
    const phone = Phone.parse('11987654321');
    expect(phone.isMobile).toBe(true);
    expect(phone.areaCode).toBe('11');
    expect(phone.formatted()).toBe('(11) 98765-4321');
    expect(phone.masked()).toBe('(11) *****-4321');
  });

  it('formats and masks a landline', () => {
    const phone = Phone.parse('(11) 3456-7890');
    expect(phone.isMobile).toBe(false);
    expect(phone.formatted()).toBe('(11) 3456-7890');
    expect(phone.masked()).toBe('(11) ****-7890');
  });

  it.each([
    ['too short', '1198765'],
    ['too long', '119876543210'],
    ['area code starting with 0', '01987654321'],
    ['area code with 0', '10987654321'],
    ['mobile not starting with 9', '11887654321'],
    ['empty', ''],
  ])('rejects %s', (_label, input) => {
    expect(() => Phone.parse(input)).toThrow(InvalidValueError);
  });

  it('compares numbers regardless of formatting', () => {
    expect(Phone.parse('(11) 98765-4321').equals(Phone.parse('+5511987654321'))).toBe(true);
    expect(Phone.parse('11987654321').equals(Phone.parse('11987654320'))).toBe(false);
  });
});

describe('Email', () => {
  it('normalizes to trimmed lowercase', () => {
    expect(Email.parse('  Ricardo@NovaEra.com.br ').value).toBe('ricardo@novaera.com.br');
  });

  it.each([
    'ricardo',
    'ricardo@',
    '@novaera.com',
    'ric ardo@novaera.com',
    `${'a'.repeat(250)}@x.com`,
  ])('rejects "%s"', (input) => {
    expect(() => Email.parse(input)).toThrow(InvalidValueError);
  });

  it('masks the local part', () => {
    expect(Email.parse('ricardo@gmail.com').masked()).toBe('r***@gmail.com');
  });

  it('compares addresses case-insensitively', () => {
    expect(Email.parse('A@b.com').equals(Email.parse('a@B.com'))).toBe(true);
    expect(Email.parse('a@b.com').equals(Email.parse('c@b.com'))).toBe(false);
  });
});
