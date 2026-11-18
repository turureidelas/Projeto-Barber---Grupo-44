import { describe, expect, it } from 'vitest';
import { InvalidValueError } from '../errors/DomainError';
import { aSingleService, ids, minutes, reais } from '../testing/builders';
import { toId, type BarbershopId, type ServiceId } from './ids';
import { Service } from './Service';

const haircut = aSingleService(ids.haircut, 'Corte');
const beard = aSingleService(ids.beard, 'Barba');

function aCombo(items: readonly Service[], overrides: Partial<{ id: ServiceId }> = {}): Service {
  return Service.createCombo({
    id: ids.combo,
    barbershopId: ids.shop,
    name: 'Corte + Barba',
    duration: minutes(50),
    price: reais(70),
    items,
    ...overrides,
  });
}

describe('Service', () => {
  it('creates an active single service with a trimmed name', () => {
    const service = Service.createSingle({
      id: ids.haircut,
      barbershopId: ids.shop,
      name: '  Corte degradê ',
      duration: minutes(40),
      price: reais(50),
    });
    expect(service.name).toBe('Corte degradê');
    expect(service.kind).toBe('SINGLE');
    expect(service.isCombo).toBe(false);
    expect(service.active).toBe(true);
    expect(service.includedServiceIds).toEqual([]);
  });

  it.each(['', '   ', 'x'.repeat(61)])('rejects the name "%s"', (name) => {
    expect(() => haircut.update({ name })).toThrow(InvalidValueError);
  });

  describe('combos', () => {
    it('has its own duration and price and lists the included services', () => {
      const combo = aCombo([haircut, beard]);
      expect(combo.isCombo).toBe(true);
      expect(combo.duration.minutes).toBe(50);
      expect(combo.price.cents).toBe(7000);
      expect(combo.includedServiceIds).toEqual([ids.haircut, ids.beard]);
    });

    it('needs at least two services', () => {
      expect(() => aCombo([haircut])).toThrow(InvalidValueError);
    });

    it('cannot include the same service twice', () => {
      expect(() => aCombo([haircut, haircut])).toThrow(InvalidValueError);
    });

    it('cannot include another combo', () => {
      const combo = aCombo([haircut, beard]);
      const other = toId<ServiceId>('svc-other');
      expect(() => aCombo([combo, haircut], { id: other })).toThrow(InvalidValueError);
    });

    it('cannot include services from another barbershop', () => {
      const foreign = Service.restore({
        ...beard.toProps(),
        barbershopId: toId<BarbershopId>('other-shop'),
      });
      expect(() => aCombo([haircut, foreign])).toThrow(InvalidValueError);
    });

    it('cannot include itself', () => {
      const props = {
        ...aCombo([haircut, beard]).toProps(),
        includedServiceIds: [ids.combo, ids.haircut],
      };
      expect(() => Service.restore(props)).toThrow(InvalidValueError);
    });
  });

  it('rejects a single service that includes others', () => {
    expect(() =>
      Service.restore({ ...haircut.toProps(), includedServiceIds: [ids.beard] }),
    ).toThrow(InvalidValueError);
  });

  it('updates and toggles activity immutably', () => {
    const updated = haircut.update({ price: reais(55), duration: minutes(35) });
    expect(updated.price.cents).toBe(5500);
    expect(updated.duration.minutes).toBe(35);
    expect(haircut.price.cents).toBe(4500);

    const inactive = haircut.deactivate();
    expect(inactive.active).toBe(false);
    expect(inactive.activate().active).toBe(true);
  });
});
