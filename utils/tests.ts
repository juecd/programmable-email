import { describe, test, expect } from '@jest/globals';
import { buildGmailSearch, GmailSearchParams } from './gmail';

describe('Gmail Search Query Builder', () => {
  describe('validateSearchParams', () => {
    test('throws on null params', () => {
      expect(() => buildGmailSearch(null as any)).toThrow('Search parameters must be an object');
    });
    
    test('throws on undefined params', () => {
      expect(() => buildGmailSearch(undefined as any)).toThrow('Search parameters must be an object');
    });
    
    test('throws on nested invalid date in OR condition', () => {
      const params: GmailSearchParams = {
        or: [{
          timeRange: { after: '2024-01-01' }
        }]
      };
      expect(() => buildGmailSearch(params)).toThrow('After date must be in YYYY/MM/DD format');
    });
    
    test('validates multiple time units', () => {
      const params: GmailSearchParams = {
        timeRange: {
          olderThan: '30d',
          newerThan: '2w' as any
        }
      };
      expect(() => buildGmailSearch(params)).toThrow('newerThan must be in format number+unit');
    });
    
    test('throws on empty time unit', () => {
      const params: GmailSearchParams = {
        timeRange: { olderThan: '30' as any }
      };
      expect(() => buildGmailSearch(params)).toThrow('olderThan must be in format number+unit');
    });
    
    test('throws on invalid time unit value', () => {
      const params: GmailSearchParams = {
        timeRange: { olderThan: 'abd' as any }
      };
      expect(() => buildGmailSearch(params)).toThrow('olderThan must be in format number+unit');
    });
    
    test('validates multiple status values', () => {
      const params: GmailSearchParams = {
        properties: { status: ['read', 'invalid', 'unread'] as any[] }
      };
      expect(() => buildGmailSearch(params)).toThrow('Invalid status: invalid');
    });
    
    test('throws on zero proximity distance', () => {
      const params: GmailSearchParams = {
        proximitySearches: [{ term1: 'a', term2: 'b', distance: 0 }]
      };
      expect(() => buildGmailSearch(params)).toThrow('distance must be a positive number');
    });
    
    test('throws on non-numeric proximity distance', () => {
      const params: GmailSearchParams = {
        proximitySearches: [{ term1: 'a', term2: 'b', distance: 'five' as any }]
      };
      expect(() => buildGmailSearch(params)).toThrow('distance must be a positive number');
    });
    
    test('validates deeply nested OR conditions', () => {
      const params: GmailSearchParams = {
        or: [{
          or: [{
            properties: { category: 'invalid' as any }
          }]
        }]
      };
      expect(() => buildGmailSearch(params)).toThrow('Invalid category value');
    });
    
    test('throws on invalid date format', () => {
      const params: GmailSearchParams = {
        timeRange: { after: '2024-01-01' }
      };
      expect(() => buildGmailSearch(params)).toThrow('After date must be in YYYY/MM/DD format');
    });

    test('throws on invalid time unit', () => {
      const params: GmailSearchParams = {
        timeRange: { olderThan: '30x' as any }
      };
      expect(() => buildGmailSearch(params)).toThrow('olderThan must be in format number+unit');
    });

    test('throws on invalid category', () => {
      const params: GmailSearchParams = {
        properties: { category: 'invalid' as any }
      };
      expect(() => buildGmailSearch(params)).toThrow('Invalid category value');
    });

    test('throws on invalid status', () => {
      const params: GmailSearchParams = {
        properties: { status: ['invalid' as any] }
      };
      expect(() => buildGmailSearch(params)).toThrow('Invalid status');
    });

    test('throws on invalid proximity distance', () => {
      const params: GmailSearchParams = {
        proximitySearches: [{ term1: 'a', term2: 'b', distance: -1 }]
      };
      expect(() => buildGmailSearch(params)).toThrow('distance must be a positive number');
    });
  });

  describe('buildGmailSearch', () => {
    test('builds basic search with single from address', () => {
      const params: GmailSearchParams = {
        participants: { from: 'test@example.com' }
      };
      expect(buildGmailSearch(params)).toBe('from:test@example.com');
    });

    test('builds search with multiple recipients', () => {
      const params: GmailSearchParams = {
        participants: {
          to: ['alice@example.com', 'bob@example.com']
        }
      };
      expect(buildGmailSearch(params)).toBe('to:alice@example.com to:bob@example.com');
    });

    test('handles date range correctly', () => {
      const params: GmailSearchParams = {
        timeRange: {
          after: '2024/01/01',
          before: '2024/12/31'
        }
      };
      expect(buildGmailSearch(params)).toBe('after:2024/01/01 before:2024/12/31');
    });

    test('handles relative time ranges', () => {
      const params: GmailSearchParams = {
        timeRange: {
          olderThan: '30d',
          newerThan: '1y'
        }
      };
      expect(buildGmailSearch(params)).toBe('older_than:30d newer_than:1y');
    });

    test('handles exact phrase search', () => {
      const params: GmailSearchParams = {
        properties: { hasExactPhrase: 'project deadline' }
      };
      expect(buildGmailSearch(params)).toBe('"project deadline"');
    });

    test('handles multiple labels', () => {
      const params: GmailSearchParams = {
        properties: { label: ['work', 'urgent'] }
      };
      expect(buildGmailSearch(params)).toBe('label:work label:urgent');
    });

    test('handles boolean properties', () => {
      const params: GmailSearchParams = {
        properties: {
          isMuted: true,
          isSnoozed: true,
          hasLabels: true
        }
      };
      expect(buildGmailSearch(params)).toBe('has:userlabels is:muted in:snoozed');
    });

    test('handles exclude terms', () => {
      const params: GmailSearchParams = {
        properties: { excludeTerms: ['spam', 'promotion'] }
      };
      expect(buildGmailSearch(params)).toBe('-spam -promotion');
    });

    test('handles proximity search with order', () => {
      const params: GmailSearchParams = {
        proximitySearches: [{
          term1: 'project',
          term2: 'deadline',
          distance: 5,
          maintainOrder: true
        }]
      };
      expect(buildGmailSearch(params)).toBe('"project AROUND 5 deadline"');
    });

    test('handles multiple OR conditions', () => {
      const params: GmailSearchParams = {
        or: [
          { participants: { from: 'alice@example.com' } },
          { participants: { from: 'bob@example.com' } }
        ]
      };
      expect(buildGmailSearch(params)).toBe('{from:alice@example.com from:bob@example.com}');
    });

    test('handles complex nested query', () => {
      const params: GmailSearchParams = {
        participants: { from: 'test@example.com' },
        timeRange: { after: '2024/01/01' },
        properties: {
          subject: 'meeting',
          status: ['unread'],
          excludeTerms: ['cancelled']
        },
        proximitySearches: [{
          term1: 'project',
          term2: 'deadline',
          distance: 5
        }]
      };
      expect(buildGmailSearch(params)).toBe(
        'from:test@example.com after:2024/01/01 subject:meeting is:unread -cancelled project AROUND 5 deadline'
      );
    });
  });
});