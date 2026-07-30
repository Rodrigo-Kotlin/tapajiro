import { describe, it, expect } from 'vitest';
import { validateRedirectDestination } from './redirect';

describe('validateRedirectDestination', () => {
  it('aceita /app', () => {
    expect(validateRedirectDestination('/app')).toBe('/app');
  });

  it('aceita /app?tab=inicio', () => {
    expect(validateRedirectDestination('/app?tab=inicio')).toBe('/app?tab=inicio');
  });

  it('aceita /app/config para estrutura futura', () => {
    expect(validateRedirectDestination('/app/config')).toBe('/app/config');
  });

  it('rejeita URL https externa', () => {
    expect(validateRedirectDestination('https://evil.example')).toBeNull();
  });

  it('rejeita URL http externa', () => {
    expect(validateRedirectDestination('http://evil.example')).toBeNull();
  });

  it('rejeita caminho iniciado por //', () => {
    expect(validateRedirectDestination('//evil.example')).toBeNull();
  });

  it('rejeita javascript:', () => {
    expect(validateRedirectDestination('javascript:alert(1)')).toBeNull();
  });

  it('rejeita data:', () => {
    expect(validateRedirectDestination('data:text/html')).toBeNull();
  });

  it('rejeita valor vazio', () => {
    expect(validateRedirectDestination('')).toBeNull();
  });

  it('rejeita apenas espaços', () => {
    expect(validateRedirectDestination('   ')).toBeNull();
  });

  it('rejeita objeto', () => {
    expect(validateRedirectDestination({ from: '/app' })).toBeNull();
  });

  it('rejeita null', () => {
    expect(validateRedirectDestination(null)).toBeNull();
  });

  it('rejeita undefined', () => {
    expect(validateRedirectDestination(undefined)).toBeNull();
  });

  it('rejeita número', () => {
    expect(validateRedirectDestination(42)).toBeNull();
  });

  it('aceita /', () => {
    expect(validateRedirectDestination('/')).toBe('/');
  });

  it('rejeita http://localhost externo (não relativo)', () => {
    expect(validateRedirectDestination('http://localhost')).toBeNull();
  });

  it('rejeita caminho sem barra inicial', () => {
    expect(validateRedirectDestination('app')).toBeNull();
  });
});
